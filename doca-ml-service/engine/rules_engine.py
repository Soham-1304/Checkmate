import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

class LegalMetrologyRulesEngine:
    """
    Deterministic Compliance Engine for Legal Metrology (Packaged Commodities) Rules, 2011
    - Rule 6: Mandatory declarations per category
    - Rule 7: Font height vs PDP area (Table I/II) + weight/volume fallback + per-field checks
    - Rule 8: Standard units + placement hints
    - Section 36: Penalty assessment -> COMPLIANT vs NON_COMPLIANT
    - Data source: config/data2.json
    Enhancements Sept 2026:
    - USP auto-calculator fallback (MRP / Net Qty)
    - Manufacturer vs Packer vs Marketer split validation
    - Per-field font height checks (Rule 7) alongside global check
    - PDP auto-estimation support (passed via payload['pdp_estimated'])
    """

    def __init__(self, schema_path: Optional[str] = None):
        candidates = []
        if schema_path:
            p = Path(schema_path)
            candidates.extend([
                p,
                Path.cwd() / p,
                Path(__file__).parent.parent / "config" / p.name,
            ])
        candidates.extend([
            Path(__file__).parent.parent / "config" / "data2.json",
            Path.cwd() / "config" / "data2.json",
            Path.cwd() / "data2.json",
            Path(__file__).parent / "data2.json",
            Path("legal_metrology_engine/config/data2.json"),
        ])
        found = None
        for c in candidates:
            if c.exists():
                found = c
                break
        if found is None:
            raise FileNotFoundError(f"data2.json schema not found. Tried: {candidates}")
        with open(found, "r", encoding="utf-8") as f:
            self.schema = json.load(f)
        self.schema_path = str(found)
        self.categories = self.schema.get("commodity_categories", {})
        self.field_rules = self.schema.get("field_validation_rules", {})
        self.font_matrix = self.schema.get("font_height_matrix", {})
        self.penalties = self.schema.get("penalties", {})

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _parse_mrp_amount(self, mrp_str: str) -> float | None:
        if not mrp_str: return None
        m = re.search(r"(\d+(?:[,\s]?\d+)*(?:\.\d{1,2})?)", mrp_str.replace("₹", "").replace("Rs", "").replace("Rs.", ""))
        if not m: return None
        try:
            return float(m.group(1).replace(",", "").replace(" ", ""))
        except: return None

    def _parse_qty_grams(self, qty_str: str) -> tuple[float | None, str | None]:
        if not qty_str: return None, None
        m = re.search(r"(\d+(?:\.\d+)?)\s*(g|kg|mg|ml|l|litre|liter|gm|grams?)\b", qty_str, re.I)
        if not m: return None, None
        val = float(m.group(1)); unit = m.group(2).lower()
        if unit in ("kg",): unit_g = val*1000; unit="g"
        elif unit in ("l","litre","liter"): unit_g = val*1000
        elif unit in ("mg",): unit_g = val*0.001
        else: unit_g = val
        # For ml we approximate as grams for USP denominator purposes
        return unit_g, unit

    def _calc_usp(self, mrp_str: str, qty_str: str) -> Dict[str, Any] | None:
        """ USP = MRP / Net Quantity . Returns dict with values per standard units."""
        mrp = self._parse_mrp_amount(mrp_str)
        qty, unit = self._parse_qty_grams(qty_str)
        if mrp is None or qty is None or qty == 0:
            return None
        per_g = mrp / qty
        # also per kg and per 100g for display
        result = {
            "mrp_inr": round(mrp, 2),
            "net_qty_value": qty,
            "net_qty_unit_norm": unit,
            "usp_per_g": round(per_g, 4),
            "usp_per_kg": round(per_g*1000, 2),
            "usp_per_100g": round(per_g*100, 2),
            "usp_display": f"₹{per_g:.2f} per g (₹{per_g*1000:.2f} per kg)",
            "usp_per_ml": round(per_g, 4) if "ml" in qty_str.lower() or "l" in qty_str.lower() else None,
            "formula": "USP = MRP ÷ Net Quantity"
        }
        # Choose display unit matching original qty unit
        low = qty_str.lower()
        if "kg" in low:
            result["unit"] = "kg"; result["value"] = result["usp_per_kg"]
        elif "ml" in low or "l" in low:
            # per ml
            result["unit"] = "ml" if "ml" in low else "l"
            # convert: per ml = per_g (since 1ml ~1g for water but keep same)
            result["value"] = result["usp_per_g"]
        else:
            result["unit"] = "g"; result["value"] = result["usp_per_g"]
        return result

    # ------------------------------------------------------------------
    def validate_package(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        category_key = payload.get("category", "general_packaged_goods")
        category_config = self.categories.get(category_key, self.categories.get("general_packaged_goods", {}))

        mandatory_fields: List[str] = category_config.get("mandatory_declarations", [])
        exempted_fields: List[str] = category_config.get("exempted_fields", [])
        extracted_fields: Dict[str, Any] = payload.get("extracted_fields", {}) or {}

        violations: List[Dict[str, Any]] = []
        passed: List[str] = []
        warnings: List[Dict[str, Any]] = []
        computed: Dict[str, Any] = {}

        # PDP handling: allow estimated vs assumed
        pdp = payload.get("pdp_area_cm2")
        pdp_est = payload.get("pdp_estimated") or payload.get("pdp_estimated_cm2")
        effective_pdp = pdp
        pdp_source = "assumed"
        if isinstance(pdp_est, dict) and pdp_est.get("estimated_cm2"):
            # If assumed was default 200 and we have high-conf estimate, prefer estimate as warning
            if pdp == 200.0 and pdp_est.get("confidence") == "high":
                effective_pdp = pdp_est["estimated_cm2"]
                pdp_source = "auto_estimated_high_conf"
            else:
                # Report estimate as info but keep assumed as primary
                warnings.append({"field":"pdp","severity":"INFO","message": f"PDP auto-estimate {pdp_est['estimated_cm2']} cm² (ratio {pdp_est.get('ratio')}, {pdp_est.get('confidence')}) vs assumed {pdp} cm². Using assumed."})

        # Track small-package exemption: <=10g/ml => all exempt
        net_val_tmp = extracted_fields.get("net_quantity", {}).get("value", "") if isinstance(extracted_fields.get("net_quantity"), dict) else str(extracted_fields.get("net_quantity",""))
        qty_g, _ = self._parse_qty_grams(net_val_tmp)
        if qty_g is not None and qty_g <= 10:
            small_cfg = self.schema.get("exemptions", {}).get("small_package", {})
            if small_cfg.get("max_weight_g", 10) >= qty_g:
                warnings.append({"field":"exemption","severity":"INFO","message": f"Small package exemption: {qty_g}g ≤10g may qualify for Rule 26(a) exemption – review category."})

        # handle exempted categories instantly
        if not mandatory_fields and category_key in ("industrial_and_institutional_goods",):
            return {
                "status": "COMPLIANT",
                "category": category_key,
                "total_violations": 0,
                "violations": [],
                "passed_checks": ["Category exempted under Rule 3(b)"],
                "warnings": [],
                "penalty": None,
            }

        # --- USP auto-calculator fallback (before mandatory check) ---
        if "unit_sale_price" not in extracted_fields or not extracted_fields.get("unit_sale_price", {}).get("value"):
            mrp_val = extracted_fields.get("mrp", {}).get("value", "") if isinstance(extracted_fields.get("mrp"), dict) else ""
            net_val = extracted_fields.get("net_quantity", {}).get("value", "") if isinstance(extracted_fields.get("net_quantity"), dict) else ""
            if mrp_val and net_val:
                calc = self._calc_usp(mrp_val, net_val)
                if calc:
                    computed["computed_usp"] = calc
                    warnings.append({
                        "field": "unit_sale_price",
                        "severity": "MEDIUM",
                        "message": f"USP not printed but auto-calculated: {calc['usp_display']} (Rule 6(1)(e) calculation fallback). Physical print still non-compliant without USP declaration.",
                        "computed": calc
                    })

        # --- Manufacturer vs Packer vs Marketer split validation ---
        has_split_roles = any(k in extracted_fields for k in ["manufacturer_name_address", "packer_name_address", "marketer_name_address", "importer_name_address"])
        if has_split_roles:
            for role_key, display in [
                ("manufacturer_name_address", "Manufacturer"),
                ("packer_name_address", "Packer"),
                ("marketer_name_address", "Marketer"),
                ("importer_name_address", "Importer"),
            ]:
                if role_key in extracted_fields:
                    val = extracted_fields[role_key].get("value","") if isinstance(extracted_fields[role_key], dict) else str(extracted_fields[role_key])
                    if not re.search(r"[1-9]\d{5}", val):
                        warnings.append({"field": role_key, "severity": "MEDIUM", "message": f"{display} address may be missing PIN code (Rule 6(1)(a) requires complete address with PIN)"})
                    passed.append(f"{display} declaration present (split entity).")

        # 1) Mandatory presence (respect exempted_fields) + split-aware check for MFR block
        for field in mandatory_fields:
            if field in exempted_fields:
                continue
            if field == "mfr_packer_importer_name_address" and has_split_roles:
                passed.append("MFR/Packer/Marketer declaration present via split entities.")
                continue
            if field == "unit_sale_price" and "computed_usp" in computed:
                val = extracted_fields.get(field, {}).get("value") if isinstance(extracted_fields.get(field), dict) else extracted_fields.get(field)
                if not val or (isinstance(val, str) and not val.strip()):
                    violations.append({
                        "rule": "Rule 6 - Mandatory Declaration Missing",
                        "field": field,
                        "severity": "CRITICAL",
                        "section": self._section_for(field),
                        "message": f"Mandatory field '{field}' is missing for category '{category_key}'. Auto-calculated: {computed['computed_usp']['usp_display']} (print this on package to comply).",
                        "computed_fallback": computed["computed_usp"]
                    })
                    continue
            val = extracted_fields.get(field, {}).get("value") if isinstance(extracted_fields.get(field), dict) else extracted_fields.get(field)
            if not val or (isinstance(val, str) and not val.strip()):
                violations.append({
                    "rule": "Rule 6 - Mandatory Declaration Missing",
                    "field": field,
                    "severity": "CRITICAL",
                    "section": self._section_for(field),
                    "message": f"Mandatory field '{field}' is missing for category '{category_key}'."
                })
            else:
                passed.append(f"Mandatory field '{field}' present.")

        # 2) Field-level regex / semantic validation (only if present)
        for field_name, field_data in list(extracted_fields.items()):
            val = field_data.get("value", "") if isinstance(field_data, dict) else str(field_data)
            if not val or not val.strip():
                continue
            rule = self.field_rules.get(field_name, {})
            regex_keys = ["validation_regex", "display_format_regex", "pincode_regex", "phone_regex", "toll_free_regex", "email_regex", "alternative_regex", "isi_mark_regex", "unit_format_regex", "size_format_regex", "dimension_regex"]
            patterns: List[str] = []
            for k in regex_keys:
                if rule.get(k):
                    patterns.append(rule[k])
            if rule.get("ocr_regex_patterns"):
                patterns.extend(rule["ocr_regex_patterns"])

            fail_msg = None

            if field_name == "mrp":
                forb = rule.get("forbidden_patterns", [])
                for fb in forb:
                    if fb.lower() in val.lower():
                        fail_msg = f"MRP contains forbidden phrase '{fb}'"
                if not re.search(r"(rs\.?|₹|inr)", val, re.I) and not re.search(r"\d", val):
                    fail_msg = fail_msg or f"MRP '{val}' missing currency/amount"
                if "mrp" in extracted_fields and not re.search(r"incl.*tax", val, re.I):
                    if not field_data.get("has_inclusive_taxes"):
                        warnings.append({"field":"mrp","severity":"MEDIUM","message":"MRP may be missing 'inclusive of all taxes' phrase (Rule 6(1)(e))"})

            elif field_name == "net_quantity":
                permitted = []
                for v in rule.get("permitted_units", {}).values():
                    permitted.extend([x.lower() for x in v])
                um = re.search(r"(\d+(?:\.\d+)?)\s*(g|kg|mg|ml|l|litre|liter|cm|m|mm|sq\s*m|sq\s*cm|n|u|pcs?|units?|gms?|grams?)\b", val, re.I)
                if um:
                    unit = um.group(2).lower().strip()
                    norm_map = {"litre":"l","liter":"l","pcs":"n","pc":"n","units":"n","unit":"n","gms":"g","gm":"g","grams":"g","gram":"g"}
                    unit = norm_map.get(unit, unit)
                    if unit in ("grams","gram"): unit="g"
                    allowed = [p.lower() for p in permitted] if permitted else ["g","kg","mg","ml","l","m","cm","mm","n","u"]
                    allowed_norm = set(allowed) | {"g","kg","mg","ml","l","n","u","m","cm","mm"}
                    if unit not in allowed_norm:
                        for q in rule.get("prohibited_qualifiers", []):
                            if q.lower() in val.lower():
                                fail_msg = f"Net quantity uses prohibited qualifier '{q}'"
                        if not fail_msg:
                            fail_msg = f"Net quantity unit '{unit}' not in authorized metric set {sorted(allowed_norm)} (Rule 8)"
                else:
                    fail_msg = f"Net quantity '{val}' missing unit (Rule 6(1)(c))"
                for term in rule.get("prohibited_number_terms", []):
                    if term.lower() in val.lower():
                        fail_msg = f"Net quantity uses prohibited term '{term}'"

            elif field_name == "fssai_lic_no":
                vr = rule.get("validation_regex")
                if vr:
                    digits = re.search(r"\d{14}", val)
                    clean = digits.group(0) if digits else re.sub(r"\D","", val)
                    if not re.fullmatch(r"[0-9]{14}", clean or ""):
                        fail_msg = f"FSSAI '{val}' must be exactly 14 digits (Rule 6 + FSSAI Regs)"
                    elif clean and clean[0] not in ("1","2"):
                        warnings.append({"field":"fssai_lic_no","severity":"MEDIUM","message":f"FSSAI '{clean}' prefix should be 1 (Central) or 2 (State)"})

            elif field_name == "consumer_care":
                is_email = re.search(rule.get("email_regex","@"), val) is not None
                is_phone = re.search(rule.get("phone_regex", r"[0-9]{10}"), val) is not None
                is_toll = re.search(rule.get("toll_free_regex", r"1800"), val) is not None
                if not (is_email or is_phone or is_toll):
                    if not re.search(r"[6-9]\d{9}|1800|@|email", val, re.I):
                        fail_msg = f"Consumer care '{val}' missing phone/email (Rule 6(2))"

            elif field_name == "mfg_date":
                pats = rule.get("ocr_regex_patterns", [])
                if pats and not any(re.search(p, val, re.I) for p in pats):
                    if not re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\/\-]\d{2,4})", val, re.I):
                        fail_msg = f"Mfg date '{val}' not in MM/YYYY or DD/MM/YYYY format (Rule 6(1)(d))"

            elif field_name == "unit_sale_price":
                vr = rule.get("unit_format_regex")
                if vr and not re.search(vr, val, re.I):
                    if not re.search(r"\d+\s*/\s*(g|kg|ml|l|n)", val, re.I):
                        fail_msg = f"USP '{val}' invalid format. Expected 'USP Rs X / g' (Rule 6(1)(e) 2021 amendment)"
                if not fail_msg and "computed_usp" not in computed:
                    mrp_v = extracted_fields.get("mrp", {}).get("value","") if isinstance(extracted_fields.get("mrp"), dict) else ""
                    qty_v = extracted_fields.get("net_quantity", {}).get("value","") if isinstance(extracted_fields.get("net_quantity"), dict) else ""
                    calc = self._calc_usp(mrp_v, qty_v) if mrp_v and qty_v else None
                    if calc:
                        m_decl = re.search(r"(\d+(?:\.\d+)?)\s*/", val)
                        if m_decl:
                            declared = float(m_decl.group(1))
                            expected = calc["value"]
                            if expected > 0 and abs(declared - expected) / expected > 0.12:
                                warnings.append({"field":"unit_sale_price","severity":"LOW","message": f"Declared USP ₹{declared} differs from calculated ₹{expected:.4f} (MRP {calc['mrp_inr']}/ {calc['net_qty_value']}{calc['unit']}) – verify calculation."})

            elif field_name in ("manufacturer_name_address","packer_name_address","marketer_name_address","importer_name_address"):
                if not re.search(r"[1-9]\d{5}", val):
                    warnings.append({"field": field_name, "severity": "LOW", "message": f"{field_name} missing PIN."})
                if len(val) < 12:
                    fail_msg = f"{field_name} too short – needs complete address with PIN (Rule 6(1)(a))"

            else:
                if patterns:
                    if not any(re.search(p, val, re.I) for p in patterns):
                        if field_name in ("fssai_lic_no","bis_registration","pincode","email_regex"):
                            fail_msg = f"Value '{val}' for '{field_name}' failed validation."

            if fail_msg:
                violations.append({
                    "rule": "Invalid Declaration Format",
                    "field": field_name,
                    "severity": "HIGH",
                    "section": self._section_for(field_name),
                    "message": fail_msg,
                })
            else:
                pass_tag = f"Format check passed for '{field_name}'."
                if pass_tag not in passed:
                    passed.append(pass_tag)

        # 3) Rule 7 Font height – PDP area thresholds + weight/volume fallback
        measured = payload.get("measured_font_height_mm")
        pdp_for_font = effective_pdp if effective_pdp is not None else pdp
        if pdp_for_font is not None and measured is not None:
            try:
                pdp_f = float(pdp_for_font); measured_f = float(measured)
                if pdp_f > 0:
                    req = self._get_required_font_height(pdp_f)
                    net_val = extracted_fields.get("net_quantity", {}).get("value", "") if isinstance(extracted_fields.get("net_quantity"), dict) else ""
                    w_req = self._get_required_font_by_weight(net_val)
                    if w_req > req:
                        warnings.append({"field":"font_height","severity":"LOW","message":f"Weight/volume requires {w_req}mm (vs PDP {req}mm) per Rule 7 weight table – PDP threshold is primary. PDP source: {pdp_source}"})
                    if measured_f >= req:
                        passed.append(f"Font height ({measured_f}mm) meets minimum required ({req}mm) for PDP {pdp_f}cm² ({pdp_source}, Rule 7).")
                    else:
                        violations.append({
                            "rule": "Rule 7 Violation - Insufficient Font Height",
                            "field": "font_height",
                            "severity": "HIGH",
                            "section": "Rule 7 & Table I/II",
                            "message": f"Measured font height is {measured_f}mm, but minimum required for PDP area {pdp_f} cm² ({pdp_source}) is {req}mm."
                        })
            except Exception as e:
                warnings.append({"field":"font_height","severity":"LOW","message":f"Font check error: {e}"})

        # 3b) Per-field font height checks (Rule 7 individual declarations)
        if pdp_for_font is not None and len(extracted_fields) > 0:
            try:
                req = self._get_required_font_height(float(pdp_for_font))
                critical_fields = ["mrp", "net_quantity", "generic_name"]
                for cf in critical_fields:
                    data = extracted_fields.get(cf)
                    if not isinstance(data, dict): continue
                    fh = data.get("font_height_mm")
                    if fh is None: continue
                    fh_f = float(fh)
                    if fh_f < req:
                        sev = "HIGH" if cf in ("mrp","net_quantity") else "MEDIUM"
                        violations.append({
                            "rule": "Rule 7 - Per-field Font Height",
                            "field": f"{cf}_font_height",
                            "severity": sev,
                            "section": "Rule 7 & Table I/II",
                            "message": f"Field '{cf}' font height {fh_f}mm < required {req}mm for PDP {pdp_for_font}cm² (Rule 7 mandates prominence)."
                        })
                    else:
                        passed.append(f"Per-field font: '{cf}' {fh_f}mm ≥ {req}mm (Rule 7).")
            except Exception as e:
                warnings.append({"field":"per_field_font","severity":"LOW","message": f"Per-field font check error: {e}"})

        # 3c) PDP area reporting
        if pdp_est and isinstance(pdp_est, dict):
            computed["pdp_estimation"] = pdp_est
            if pdp_est.get("confidence") == "high" and pdp_source == "auto_estimated_high_conf":
                passed.append(f"PDP area auto-estimated {pdp_est['estimated_cm2']}cm² (confidence {pdp_est['confidence']}, method {pdp_est.get('method')})")
            elif pdp_est.get("estimated_cm2"):
                warnings.append({"field":"pdp_area","severity":"INFO","message": f"PDP auto-estimate available: {pdp_est['estimated_cm2']}cm² (conf {pdp_est.get('confidence')}), but using assumed {pdp}cm². Consider passing auto-estimated value."})

        # 3d) Rule 8 – Declaration placement (PDP, area surrounding quantity, free space)
        try:
            net_data = extracted_fields.get("net_quantity", {})
            if isinstance(net_data, dict) and net_data.get("bbox"):
                bbox = net_data["bbox"]
                try:
                    import numpy as np
                    arr = np.array(bbox)
                    cx, cy = float(np.mean(arr[:,0])), float(np.mean(arr[:,1]))
                    img_meta = payload.get("image_metadata") or {}
                    iw, ih = img_meta.get("image_width_px", 1000), img_meta.get("image_height_px", 1000)
                    if pdp_est and pdp_est.get("ratio", 1) < 0.45:
                        warnings.append({"field":"placement","severity":"MEDIUM","message":"PDP ratio low (maybe not principal display panel) – verify Net Quantity on PDP (Rule 8)"})
                    h_px = float(np.max(arr[:,1]) - np.min(arr[:,1]))
                    clearance = 2 * h_px
                    if cx < clearance or cx > iw - clearance:
                        warnings.append({"field":"placement","severity":"MEDIUM","message":"Net Quantity near vertical edge – may violate Rule 8 free space (left/right 2x height)"})
                    if cy < h_px or cy > ih - h_px:
                        warnings.append({"field":"placement","severity":"LOW","message":"Net Quantity near horizontal edge – Rule 8 requires height clearance above/below"})
                except Exception:
                    pass
            else:
                warnings.append({"field":"placement","severity":"LOW","message":"Placement not verified (no bbox) – ensure declarations on PDP per Rule 8"})
        except Exception as e:
            warnings.append({"field":"placement","severity":"LOW","message": f"Placement check error: {e}"})

        # 3e) Rule 9 – Manner of declaration
        try:
            if payload.get("contrast_signals") is None:
                warnings.append({"field":"readability","severity":"INFO","message":"Color contrast not auto-verified (Rule 9) – manual visual check recommended for MRP/Net Qty prominence"})
        except Exception:
            pass

        # 4) Barcode GTIN validation
        barcode_signals = payload.get("barcode_signals") or payload.get("barcodes")
        if barcode_signals:
            bc = barcode_signals.get("barcodes") if isinstance(barcode_signals, dict) else barcode_signals
            if bc:
                valid = any(b.get("ean13_valid") for b in bc if isinstance(b, dict))
                primary = barcode_signals.get("primary_gtin") if isinstance(barcode_signals, dict) else None
                if primary:
                    computed["gtin"] = primary
                    passed.append(f"GTIN barcode decoded: {primary} (EAN-13 valid: {valid})")
                else:
                    warnings.append({"field":"barcode","severity":"LOW","message":"Barcodes detected but no GTIN-13 primary."})
            else:
                warnings.append({"field":"barcode","severity":"LOW","message":"No EAN-13 barcode decoded – verify GTIN placement (Legal Metrology + retail requirement)."})

        # 5) Real-time confidence -> REVIEW aggregation (doc §3.5 + §7)
        quality_signals = payload.get("quality_signals") or {}
        avg_conf = payload.get("avg_ocr_confidence")
        if avg_conf is None and extracted_fields:
            confs = [d.get("confidence") for d in extracted_fields.values() if isinstance(d, dict) and d.get("confidence") is not None]
            if confs:
                try: avg_conf = float(sum(confs)/len(confs))
                except: avg_conf = None
        needs_review = False
        review_reasons: List[str] = []
        if quality_signals.get("gate") == "REVIEW":
            needs_review = True
            review_reasons.append(f"Image quality REVIEW (score {quality_signals.get('overall_score')})")
        if quality_signals.get("gate") == "REJECT":
            needs_review = True
            review_reasons.append("Image quality REJECT – recapture recommended")
        if avg_conf is not None and avg_conf < 0.55:
            needs_review = True
            review_reasons.append(f"Low avg OCR confidence {avg_conf:.2f} <0.55")
        low_conf_fields = [k for k,v in extracted_fields.items() if isinstance(v, dict) and v.get("confidence") is not None and float(v["confidence"]) < 0.45]
        if len(low_conf_fields) >= 2:
            needs_review = True
            review_reasons.append(f"Multiple low-confidence fields {low_conf_fields}")
        critical_missing = [v["field"] for v in violations if v["severity"]=="CRITICAL"]
        if needs_review and critical_missing and quality_signals.get("overall_score",1) < 0.6:
            for v in violations[:]:
                if v["field"] in ("mrp","net_quantity") and v["severity"]=="CRITICAL":
                    warnings.append({"field": v["field"], "severity": "REVIEW", "message": f"Missing '{v['field']}' but image quality low – mark REVIEW, not confirmed violation (officer to verify evidence)"})

        if needs_review and not violations:
            status = "REVIEW"
        elif needs_review and violations:
            status = "REVIEW" if any("REVIEW" in w.get("severity","") for w in warnings) or avg_conf is not None and avg_conf < 0.5 else ("NON_COMPLIANT" if violations else "COMPLIANT")
            if status == "NON_COMPLIANT" and (avg_conf is not None and avg_conf < 0.6 or quality_signals.get("overall_score",1) < 0.55):
                status = "REVIEW"
                warnings.append({"field":"overall","severity":"REVIEW","message":"Low confidence/quality -> overall REVIEW (officer must accept/correct)"})
        else:
            status = "NON_COMPLIANT" if violations else "COMPLIANT"

        if needs_review:
            computed["review_reasons"] = review_reasons
            computed["avg_ocr_confidence"] = round(float(avg_conf),3) if avg_conf is not None else None
            computed["needs_review"] = True

        penalty = None
        if status in ("NON_COMPLIANT","REVIEW") and violations:
            has_critical = any(v["severity"]=="CRITICAL" for v in violations)
            penalty = {
                "section": "Section 36(1) of Legal Metrology Act, 2009",
                "offense_type": "non_conforming_declarations" if has_critical else "declaration_error",
                "first_offense": self.penalties.get("section_36_1_non_conforming_declarations", {}).get("first_offense", "warning"),
                "second_offense_max_fine_inr": self.penalties.get("section_36_1_non_conforming_declarations", {}).get("second_offense_max_fine_inr", 500000),
            }

        rule_version = self.schema.get("source_metadata", {}).get("rules_notification", "G.S.R. 202(E) 2011")
        amendments = self.schema.get("source_metadata", {}).get("amendments_tracked", [])

        out = {
            "status": status,
            "category": category_key,
            "total_violations": len(violations),
            "violations": violations,
            "passed_checks": passed,
            "warnings": warnings,
            "penalty": penalty,
            "schema_source": Path(self.schema_path).name,
            "rule_version": rule_version,
            "amendments": amendments,
            "category_inferred": payload.get("category_inferred", False),
        }
        if computed:
            out["computed"] = computed
        return out

    # ------------------------------------------------------------------
    def _section_for(self, field: str) -> str:
        alias = {
            "manufacturer_name_address": "mfr_packer_importer_name_address",
            "packer_name_address": "mfr_packer_importer_name_address",
            "marketer_name_address": "mfr_packer_importer_name_address",
            "importer_name_address": "mfr_packer_importer_name_address",
        }
        f = alias.get(field, field)
        return self.field_rules.get(f, {}).get("section_citation", "")

    def _get_required_font_height(self, pdp_area_cm2: float) -> float:
        thresholds = self.font_matrix.get("pdp_area_thresholds", [])
        for entry in thresholds:
            lo = float(entry.get("pdp_area_cm2_min", 0))
            hi = entry.get("pdp_area_cm2_max")
            if hi is None:
                if pdp_area_cm2 >= lo:
                    return float(entry.get("min_font_height_mm_standard", 1.0))
            else:
                hi_f = float(hi)
                if lo <= pdp_area_cm2 < hi_f or (pdp_area_cm2 == hi_f and hi_f <= 100):
                    return float(entry.get("min_font_height_mm_standard", 1.0))
        return 1.0

    def _get_required_font_by_weight(self, net_qty_str: str) -> float:
        if not net_qty_str: return 0.0
        m = re.search(r"(\d+(?:\.\d+)?)\s*(g|kg|mg|ml|l)\b", net_qty_str, re.I)
        if not m: return 0.0
        val = float(m.group(1)); unit = m.group(2).lower()
        if unit == "kg": val *= 1000
        if unit == "l": val *= 1000
        if unit == "mg": val *= 0.001
        for entry in self.font_matrix.get("weight_volume_thresholds", []):
            lo = float(entry.get("net_qty_g_ml_min", 0))
            hi = entry.get("net_qty_g_ml_max")
            if hi is None:
                if val >= lo: return float(entry.get("min_font_height_mm_standard", 1.0))
            else:
                if lo <= val < float(hi): return float(entry.get("min_font_height_mm_standard", 1.0))
        return 0.0
