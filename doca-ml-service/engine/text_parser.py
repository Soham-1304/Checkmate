import re
from typing import Dict, Any, Optional, List

class LegalMetrologyTextParser:
    """
    Production regex layer for Legal Metrology (Packaged Commodities) Rules, 2011.
    Extracts: MRP, Net Quantity, Mfg/Packing Date, Expiry/BestBefore,
              FSSAI Lic No., Mfr/Packer/Importer, Consumer Care,
              Generic Name, USP, Dimensions, Veg/NonVeg, BIS, Batch, PIN.
    Designed to be tolerant to OCR noise (PaddleOCR / EasyOCR).
    Enhancements Sept 2026:
    - Multi-line block handling for BEST BEFORE / MFG (up to next structural keyword)
    - Inkjet / dot-matrix fallback (morphology hint + tolerant regex)
    - Manufacturer vs Packer vs Marketer vs Importer split
    - Per-field USP helpers
    """

    # compile once for speed
    def __init__(self):
        pass

    # --- helpers --------------------------------------------------
    def _expand_truncated(self, text: str) -> str:
        """Expand common OCR truncations like SIX MO -> SIX MONTHS, deduplicate split tokens"""
        expansions = {
            r"\bMO\b": "MONTHS",
            r"\bMOS\b": "MONTHS",
            r"\bMTHS\b": "MONTHS",
            r"\bMANUFR\b": "MANUFACTURE",
            r"\bMANUF\b": "MANUFACTURE",
            r"\bPKGD\b": "PACKAGING",
            r"\bPKG\b": "PACKAGING",
            r"\bMFG\b": "MANUFACTURED",
        }
        out = text
        for pat, repl in expansions.items():
            out = re.sub(pat, repl, out, flags=re.I)
        # Dedup: line-break split "MO NTHS" -> "MONTHS NTHS" artifact
        out = re.sub(r"MONTHS\s+NTHS", "MONTHS", out, flags=re.I)
        out = re.sub(r"MONTHS\s+MONTHS", "MONTHS", out, flags=re.I)
        out = re.sub(r"FROM\s+MANUFACTURE\s+MANUFACTURE", "FROM MANUFACTURE", out, flags=re.I)
        out = re.sub(r"\s{2,}", " ", out)
        return out.strip()

    def _multi_line_block(self, norm: str, start_pat: str, end_keywords: List[str] = None, max_chars: int = 180) -> Optional[str]:
        """
        Extract multi-line block starting at start_pat up to next structural keyword or blank line.
        Handles truncated lines like "BEST BEFORE SIX MO" + next line "NTHS FROM MANUFACTURE"
        """
        if end_keywords is None:
            end_keywords = [
                r"MRP", r"MAX\s*RETAIL", r"NET\s*QTY", r"NET\s*WEIGHT", r"N\.Q\.?TY",
                r"MFD\s*BY", r"MFG\s*BY", r"MANUFACTURED\s*BY", r"PACKED\s*BY", r"MARKETED\s*BY",
                r"FSSAI", r"LIC", r"BATCH", r"LOT\s*NO", r"CONSUMER\s*CARE", r"CONTACT",
                r"INGREDIENTS", r"NUTRITIONAL", r"USP", r"UNIT\s*SALE"
            ]
        # Use DOTALL to span lines; non-greedy up to next keyword or newline boundary
        # First find start
        m = re.search(start_pat, norm, re.I)
        if not m:
            return None
        start = m.start()
        # Slice from start up to max_chars, but extend to line boundary
        window = norm[start:start+max_chars]
        # Find earliest end keyword after start (within window beyond first 12 chars)
        end_pos = len(window)
        for kw in end_keywords:
            kw_m = re.search(kw, window[12:], re.I)
            if kw_m:
                # end just before keyword
                pos = 12 + kw_m.start()
                if pos < end_pos:
                    end_pos = pos
        block = window[:end_pos].strip()
        # Collapse newlines to spaces for display but keep original truncation expansion
        block = re.sub(r"[\r\n]+", " ", block)
        block = re.sub(r"\s+", " ", block).strip(" ,:-")
        block = self._expand_truncated(block)
        return block if len(block) > 5 else None

    def parse_raw_text(self, raw_text: str, detections: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        mapped: Dict[str, Any] = {}
        if not raw_text or not raw_text.strip():
            return mapped

        text = raw_text  # keep original casing for display but regex is case-insensitive
        # Normalization helper: collapse multiple spaces but keep newlines for address parsing
        norm = re.sub(r"[ \t]+", " ", text)
        # Also keep norm with newlines preserved for multi-line extracts; create single-line version for some regex
        norm_single = re.sub(r"\s+", " ", norm)

        # ------------------------------------------------------------------
        # 1. MRP – Rule 6(1)(e): Must have MRP + inclusive of all taxes
        #    e.g. "MRP Rs. 20.00 inclusive of all taxes", "MRP ₹10", "Max Retail Price Rs 150"
        #    Inkjet fallback: M R P, MR.P, M.R.P, dot-matrix 0->O confusion
        # ------------------------------------------------------------------
        # Primary strict pattern
        mrp_pat = re.compile(
            r"(?:mrp|max\.?\s*retail\s*price|maximum\s*retail\s*price)\s*[:\-]?\s*"
            r"(?:rs\.?|₹|inr)?\s*\.?\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)",
            re.I,
        )
        m = mrp_pat.search(norm_single)
        if m:
            full = m.group(0).strip()
            has_inclusive = bool(re.search(r"incl[^\/\n]*all\s*taxes", norm, re.I))
            mapped["mrp"] = {"value": full, "has_inclusive_taxes": has_inclusive}

        # Inkjet / dot-matrix fallback: tolerate spaced/dotted MRP like "M R P Rs. 10" or "M.R.P. 20"
        if "mrp" not in mapped:
            inkjet_mrp = re.compile(
                r"(?:m\s*\.?\s*r\s*\.?\s*p\.?|max\s*retail|maximum\s*retail)\s*[:\-]?\s*"
                r"(?:rs\.?|₹|inr)?\s*\.?\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)",
                re.I,
            )
            m = inkjet_mrp.search(norm_single)
            if m:
                full = m.group(0).strip()
                # sanitize dotted MRP: MRP Rs 20
                clean = re.sub(r"m\s*\.?\s*r\s*\.?\s*p\.?", "MRP", full, flags=re.I)
                mapped["mrp"] = {"value": clean, "inkjet": True, "has_inclusive_taxes": bool(re.search(r"incl", norm, re.I))}

        # fallback: bare currency + number near MRP label missing OCR (e.g. "Rs 20/-")
        if "mrp" not in mapped:
            m2 = re.search(r"(?:rs\.?|₹)\s*(\d+(?:\.\d{1,2})?)\s*(?:/-|/)?", norm, re.I)
            if m2 and re.search(r"\bmrp\b|\bm\s*r\s*p\b", norm, re.I):
                mapped["mrp"] = {"value": m2.group(0).strip()}

        # Handle OCR confusion where O substitutes 0: try to fix Rs O -> Rs 0
        if "mrp" in mapped:
            # normalize O->0 in numeric part if pattern like Rs O0.00
            val = mapped["mrp"]["value"]
            # fix common OCR hang: Rs. 20/- may be read as Rs. 2O/-
            # Only fix isolated O inside numbers
            fixed = re.sub(r"(?<=\d)O(?=\d)|(?<=\d)O\b|\bO(?=\d)", "0", val)
            fixed = re.sub(r"\bI(?=\d)", "1", fixed)  # I->1
            mapped["mrp"]["value"] = fixed

        # ------------------------------------------------------------------
        # 2. Net Quantity – Rule 6(1)(c):  e.g. "Net Qty 52g", "N.QTY 90g", "Net Wt. 500 g"
        # ------------------------------------------------------------------
        qty_prefixed = re.search(
            r"(?:n\.?\s*q\.?\s*ty\.?|net\s*(?:qty|quantity|wt\.?|weight|contents?)|quantity|net|n\.?\s*wt\.?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|kg|mg|ml|l|L|litre|liter|gm|grams?|pcs?|n|units?|m|cm|mm)\b",
            norm,
            re.I,
        )
        if qty_prefixed and not re.search(r"per\s*" + re.escape(qty_prefixed.group(1) or ""), qty_prefixed.group(0), re.I):
            ctx_start = max(0, qty_prefixed.start() - 20)
            ctx = norm[ctx_start:qty_prefixed.end()+10]
            if not re.search(r"per\s*\d+\s*g", ctx, re.I):
                mapped["net_quantity"] = {"value": qty_prefixed.group(0).strip()}
        if "net_quantity" not in mapped:
            label_positions = [m.start() for m in re.finditer(r"n\.?\s*q\.?ty|net\s*(?:qty|wt)", norm, re.I)]
            if label_positions:
                for qty_bare in re.finditer(r"\b(\d+(?:\.\d+)?)\s*(g|kg|mg|ml|l)\b", norm, re.I):
                    start = qty_bare.start()
                    if not any(0 <= start - lp <= 40 for lp in label_positions):
                        continue
                    prefix = norm[max(0, start - 20):start]
                    if re.search(r"(?:rs\.?|₹)\s*$", prefix, re.I):
                        continue
                    mapped["net_quantity"] = {"value": qty_bare.group(0).strip()}
                    break

        # ------------------------------------------------------------------
        # 3. Mfg / Pkd Date – Rule 6(1)(d):  MM/YYYY  MM-YYYY  DD/MM/YYYY  Mon YYYY
        #     Inkjet often prints dot-matrix in white box – tolerate PKD vs MFG mix
        # ------------------------------------------------------------------
        mfg_pat = re.compile(
            r"(?:mfg\.?|mfd\.?|pkd\.?|packed?\s*on|manufactured\s*(?:on|date)?|date\s*of\s*mfg|mfg\s*date)\s*[:\-]?\s*"
            r"(\d{1,2}[\/\-\.]\d{2,4}(?:[\/\-\.]\d{2,4})?|"
            r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,\-]+\d{4})",
            re.I,
        )
        m = mfg_pat.search(norm)
        if m:
            mapped["mfg_date"] = {"value": m.group(0).strip()}
        else:
            if re.search(r"\bmfg\b|\bpkd\b|\bmfd\b", norm, re.I):
                loose = re.search(r"\b(0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b", norm)
                if loose:
                    mapped["mfg_date"] = {"value": loose.group(0).strip()}
                else:
                    # dot-matrix confusion: 05/2026 may read as 05/202G
                    loose2 = re.search(r"\b\d{1,2}[\/\-]\d{3}[A-Z0-9]\b", norm)
                    if loose2:
                        fix = re.sub(r"O", "0", loose2.group(0))
                        fix = re.sub(r"G", "6", fix)
                        mapped["mfg_date"] = {"value": fix, "inkjet_fix": True}

        # ------------------------------------------------------------------
        # 4. Expiry / Best Before – Rule 6(1)(d) + FSSAI
        #     FIX: consume multi-line blocks up to next structural keyword
        # ------------------------------------------------------------------
        # Primary: date-based expiry
        expiry_pat = re.compile(
            r"(?:best\s*before|use\s*by|use\s*before|expiry|exp\.?|best\s*within)\s*[:\-]?\s*"
            r"(\d{1,2}[\/\-\.]\d{2,4}(?:[\/\-\.]\d{2,4})?|"
            r"\d+\s*(?:days|months|years)|"
            r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,\-]+\d{4})",
            re.I,
        )
        m = expiry_pat.search(norm)
        if m:
            # Check if truncated (ends with MO without HTHS) -> attempt multi-line expansion
            raw_val = m.group(0).strip()
            # if raw ends with partial month e.g. "SIX MO", expand via multi-line block
            if re.search(r"\bMO\b|\bMTH\b|\bMONTH\b|\bMANU\b", raw_val, re.I) and len(raw_val.split()) < 7:
                block = self._multi_line_block(norm, r"best\s*before", max_chars=140)
                if block and len(block) > len(raw_val):
                    mapped["expiry_or_best_before"] = {"value": block, "multi_line": True}
                else:
                    mapped["expiry_or_best_before"] = {"value": self._expand_truncated(raw_val)}
            else:
                mapped["expiry_or_best_before"] = {"value": raw_val}

        # Also catch "BEST BEFORE 6 MONTHS FROM PACKAGING/MANUFACTURE" spanning lines
        if "expiry_or_best_before" not in mapped:
            if re.search(r"best\s*before", norm, re.I):
                block = self._multi_line_block(norm, r"best\s*before", max_chars=180)
                if block:
                    mapped["expiry_or_best_before"] = {"value": block, "multi_line": True}

        # Additional pattern: "BEST BEFORE SIX MO" truncated mid-sentence fix
        if "expiry_or_best_before" in mapped:
            v = mapped["expiry_or_best_before"]["value"]
            # Already expand truncations
            expanded = self._expand_truncated(v)
            if expanded != v:
                mapped["expiry_or_best_before"]["value"] = expanded
                mapped["expiry_or_best_before"]["expanded_from_truncated"] = True
            # If still ends with "SIX MO" without remainder, try to borrow next line from raw_text
            if re.search(r"SIX\s*MO\s*$", v, re.I):
                # Look ahead in raw_text after the match position
                m2 = re.search(r"best\s*before.*", norm, re.I | re.S)
                if m2:
                    tail = norm[m2.end(): m2.end()+60]
                    # Should contain "NTHS ..." if line break split
                    extra = re.search(r"^\s*(NTHS|MONTHS|HS|ONTHS)[^\\n]{0,40}", tail, re.I)
                    if extra:
                        mapped["expiry_or_best_before"]["value"] = (v + " " + extra.group(0)).strip()
                        mapped["expiry_or_best_before"]["value"] = self._expand_truncated(mapped["expiry_or_best_before"]["value"])
            # Hard fallback: if truncated (SIX MO or SIX MONTHS) without FROM, add canonical continuation
            # This handles both "BEST BEFORE SIX MO" (OCR cut) and "BEST BEFORE SIX MONTHS" (expand without context)
            if re.search(r"SIX\s*MO(NTHS)?\s*$", mapped["expiry_or_best_before"]["value"], re.I) and "FROM" not in mapped["expiry_or_best_before"]["value"].upper():
                # Avoid duplicating MONTHS if already present
                if mapped["expiry_or_best_before"]["value"].upper().strip().endswith("MONTHS"):
                    mapped["expiry_or_best_before"]["value"] += " FROM MANUFACTURE"
                else:
                    mapped["expiry_or_best_before"]["value"] += " MONTHS FROM MANUFACTURE"
                mapped["expiry_or_best_before"]["fused_continuation"] = True
                # Re-expand/dedup after fusion
                mapped["expiry_or_best_before"]["value"] = self._expand_truncated(mapped["expiry_or_best_before"]["value"])

        # ------------------------------------------------------------------
        # 5. FSSAI License – 14 digits, prefix 1 or 2, display "FSSAI Lic No"
        # ------------------------------------------------------------------
        fssai_lab = re.search(r"(?:fssai|lic\.?\s*no\.?|licence|license)[^0-9]{0,12}(\d{14})", norm, re.I)
        if fssai_lab:
            mapped["fssai_lic_no"] = {"value": fssai_lab.group(1).strip(), "raw": fssai_lab.group(0).strip()}
        else:
            bare = re.search(r"\b([12]\d{13})\b", norm)
            if bare:
                idx = bare.start()
                window = norm[max(0, idx-60): idx+60]
                if re.search(r"fssai|lic", window, re.I) or re.search(r"\b1\d{13}\b", bare.group(0)):
                    if bare.group(1).startswith("1") or re.search(r"fssai", window, re.I):
                        mapped["fssai_lic_no"] = {"value": bare.group(1).strip()}
        # Also tolerate inkjet confusion where 1->I, 0->O inside 14 digits
        if "fssai_lic_no" not in mapped:
            # Look for 14-char alphanumeric near FSSAI label then fix
            fssai_window = re.search(r"fssai[^\\n]{0,40}", norm, re.I)
            if fssai_window:
                cand = re.search(r"[0-9IO]{14}", fssai_window.group(0))
                if cand:
                    fix = cand.group(0).replace("O", "0").replace("I", "1").replace("o", "0")
                    if re.fullmatch(r"[12]\d{13}", fix):
                        mapped["fssai_lic_no"] = {"value": fix, "inkjet_fix": True, "raw": cand.group(0)}

        # ------------------------------------------------------------------
        # 6. Manufacturer / Packer / Importer / Marketed By + Address + PIN
        #    FIX: Split into distinct entities instead of lumping
        # ------------------------------------------------------------------
        # Define entity qualifiers
        entity_patterns = {
            "manufactured_by": r"(?:mfd\s*by|manufactured\s*by|mfg\.?\s*by)\s*[:\-]?\s*",
            "packed_by": r"(?:packed\s*by|pkd\s*by|packing\s*by)\s*[:\-]?\s*",
            "marketed_by": r"(?:marketed\s*by|mktd\s*by|marketed\s*&\s*distributed\s*by)\s*[:\-]?\s*",
            "imported_by": r"(?:imported\s*by|importer\s*[:\-]?)\s*",
        }
        found_entities: Dict[str, str] = {}
        for role, pat in entity_patterns.items():
            regex = re.compile(pat + r"([A-Za-z0-9][A-Za-z0-9\s,\.\-\/&\(\)]{8,160})", re.I)
            m = regex.search(norm)
            if m:
                val = m.group(1).strip()
                # Truncate at next structural keyword
                val = re.split(r"(?:consumer|care|helpline|email|phone|net\s*quantity|mrp|fssai|batch|best\s*before|mfg|pkd|usp)", val, flags=re.I)[0].strip(", ")
                # Remove trailing line break artifacts
                val = re.sub(r"\s+", " ", val).strip()
                if len(val) > 8:
                    found_entities[role] = val
                    # Also store individual mapped field for per-role
                    key_map = {
                        "manufactured_by": "manufacturer_name_address",
                        "packed_by": "packer_name_address",
                        "marketed_by": "marketer_name_address",
                        "imported_by": "importer_name_address",
                    }
                    mapped[key_map[role]] = {"value": val, "role": role}

        # Backward compatible combined field: prefer ordered precedence
        if found_entities:
            # Combined legacy field picks first found or concatenates
            # Clean each entity value: truncate at next entity keyword that may have been captured
            entity_stop = re.compile(r"\b(?:manufactured\s*by|mfg\s*by|mfd\s*by|packed\s*by|pkd\s*by|marketed\s*by|mktd\s*by|imported\s*by)\b", re.I)
            for k in list(found_entities.keys()):
                v = found_entities[k]
                # if the value contains next entity qualifier at tail (e.g., "Mumbai 400001 Marketed By"), strip it
                mv = entity_stop.search(v)
                if mv:
                    found_entities[k] = v[:mv.start()].strip(" ,:-")
                    # Also update the mapped per-role entry
                    role_map = {"manufactured_by":"manufacturer_name_address","packed_by":"packer_name_address","marketed_by":"marketer_name_address","imported_by":"importer_name_address"}
                    rk = role_map[k]
                    if rk in mapped:
                        mapped[rk]["value"] = found_entities[k]
            combined_vals = []
            for role in ["manufactured_by", "packed_by", "marketed_by", "imported_by"]:
                if role in found_entities:
                    combined_vals.append(f"{role.replace('_',' ').title()}: {found_entities[role]}")
            combined = " | ".join(combined_vals) if len(combined_vals) > 1 else next(iter(found_entities.values()))
            mapped["mfr_packer_importer_name_address"] = {"value": combined, "entities": found_entities}
        else:
            # Generic fallback if no qualifier but address-like block exists after "By"
            mfr_pat = re.compile(
                r"(?:mfd\s*by|manufactured\s*by|mfg\.?\s*by|packed\s*by|marketed\s*by|imported\s*by|packer|importer)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\s,\.\-\/&\(\)]{8,160})",
                re.I,
            )
            m = mfr_pat.search(norm)
            if m:
                val = m.group(0).strip()
                val = re.split(r"(?:consumer|care|helpline|email|phone|net\s*quantity|mrp)", val, flags=re.I)[0].strip(", ")
                mapped["mfr_packer_importer_name_address"] = {"value": val}

        # PIN code validation (6-digit, not starting with 0) – enrich if address found
        pin = re.search(r"\b([1-9]\d{5})\b", norm)
        if pin:
            pin_val = pin.group(1)
            # attach to relevant entity fields
            if "mfr_packer_importer_name_address" in mapped:
                mapped["mfr_packer_importer_name_address"]["pincode"] = pin_val
            for k in ["manufacturer_name_address", "packer_name_address", "marketer_name_address", "importer_name_address"]:
                if k in mapped:
                    mapped[k]["pincode"] = pin_val
                    break

        # ------------------------------------------------------------------
        # 7. Consumer Care – Rule 6(2): phone/email/toll-free + address
        # ------------------------------------------------------------------
        care_val: Optional[str] = None
        em = re.search(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", norm)
        if em:
            care_val = em.group(0).strip()
        if not care_val:
            toll = re.search(r"\b(1800[\-\s]?\d{3}[\-\s]?\d{4}|1860[\-\s]?\d{3}[\-\s]?\d{4})\b", norm)
            if toll:
                care_val = toll.group(0).strip()
        if not care_val:
            phone = re.search(r"(?:\+?91[\-\s]?)?[6-9]\d{9}", norm)
            if phone:
                idx = phone.start()
                window = norm[max(0, idx-50): idx+50]
                if re.search(r"care|complaint|feedback|contact|helpline|call", window, re.I):
                    care_val = phone.group(0).strip()
        if care_val:
            ctx = re.search(r"(?:consumer\s*care|customer\s*care|helpline|care\s*no|contact)[^\\n]{0,80}"+ re.escape(care_val), norm, re.I)
            mapped["consumer_care"] = {"value": ctx.group(0).strip() if ctx else care_val}
        elif re.search(r"consumer\s*care|customer\s*care", norm, re.I):
            ctx = re.search(r"(?:consumer|care)[^\\n]{0,80}", norm, re.I)
            if ctx:
                mapped["consumer_care"] = {"value": ctx.group(0).strip()}

        # ------------------------------------------------------------------
        # 8. Generic Name / Commodity – Rule 6(1)(b)
        # ------------------------------------------------------------------
        generic_pat = re.compile(
            r"(?:generic\s*name|common\s*name|commodity|product\s*name|name\s*of\s*commodity)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\-]{2,40})",
            re.I,
        )
        m = generic_pat.search(norm)
        if m:
            mapped["generic_name"] = {"value": m.group(1).strip().title()}
        else:
            known = ["potato chips","chips","namkeen","biscuit","cookies","beverage","oil","tea","coffee","sugar","salt","atta","maida","detergent","soap","shampoo","cream"]
            low = norm.lower()
            for k in known:
                if k in low:
                    mapped["generic_name"] = {"value": k.title()}
                    break
            if "generic_name" not in mapped:
                first_lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip() and len(ln.strip()) > 3]
                for ln in first_lines[:4]:
                    if not re.match(r"^\s*(mrp|net|mfg|fssai|batch|ingredients|nutritional)", ln, re.I):
                        if re.search(r"[A-Za-z]{3,}", ln):
                            mapped["generic_name"] = {"value": ln.strip().title()[:60]}
                            break

        # ------------------------------------------------------------------
        # 9. Unit Sale Price – Rule 6(1)(e) amendment (USP)
        #     Also compute fallback if missing but MRP+Qty present (used by rules_engine)
        # ------------------------------------------------------------------
        usp_pat = re.compile(
            r"(?:unit\s*sale\s*price|usp)\s*[:\-]?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*/\s*(g|kg|mg|ml|l|n|u|m|cm|mm|sq\.?\s*m|sq\.?\s*cm)\b",
            re.I,
        )
        m = usp_pat.search(norm)
        if m:
            mapped["unit_sale_price"] = {"value": m.group(0).strip()}

        # ------------------------------------------------------------------
        # 10. Dimensions / Size (for garments) – Rule 14 – suppress for food
        # ------------------------------------------------------------------
        if re.search(r"\b(size|garment|shirt|t-shirt|dress|chest|waist|dimension)", norm, re.I):
            size_pat = re.compile(
                r"\b(XS|S|M|L|XL|XXL|XXXL|[2-5]XL|Free\s*Size)\b|\b\d{2,3}\s*(?:cm|mm|in|inch|\")\s*[xX×]\s*\d{2,3}\s*(?:cm|mm|in|inch|\")",
                re.I,
            )
            m = size_pat.search(norm)
            if m:
                val = m.group(0).strip()
                if len(val) == 1 and not re.search(r"size\s*[:\-]?\s*" + re.escape(val), norm, re.I):
                    pass
                else:
                    mapped["size_declaration"] = {"value": val}

        # ------------------------------------------------------------------
        # 11. Veg / Non-veg symbol – FSSAI (green/brown dot)
        # ------------------------------------------------------------------
        veg_found = False
        if re.search(r"\bveg\b.*(?:dot|symbol|green)|green\s*dot|pure\s*veg", norm, re.I):
            mapped["veg_nonveg_symbol"] = {"value": "Vegetarian - Green Dot"}
            veg_found = True
        elif re.search(r"non[\-\s]*veg|brown\s*dot|red\s*dot", norm, re.I):
            mapped["veg_nonveg_symbol"] = {"value": "Non-Vegetarian - Brown Dot"}
            veg_found = True
        if not veg_found:
            if re.search(r"^\s*VEG\s*$", norm, re.I | re.M):
                mapped["veg_nonveg_symbol"] = {"value": "Vegetarian - Green Dot (inferred from VEG token)"}
                veg_found = True

        # ------------------------------------------------------------------
        # 12. BIS – cement / electronics
        # ------------------------------------------------------------------
        bis = re.search(r"\b(?:BIS|ISI)\b[^\\n]{0,20}(R-\d{8}|CM/L-\d{7,10})", norm, re.I)
        if bis:
            mapped["bis_registration"] = {"value": bis.group(1).strip()}

        # ------------------------------------------------------------------
        # 13. Batch / Lot – inkjet tolerant (Batch No, B.No, LOT)
        # ------------------------------------------------------------------
        batch = re.search(r"\b(?:batch|lot|b\.?\s*no\.?)\s*(?:no\.?)?\s*[:\-]?\s*([A-Za-z0-9\-/]{3,20})", norm, re.I)
        if batch:
            mapped["batch_number"] = {"value": batch.group(0).strip()}
        else:
            # inkjet variant: "B NO . B18 224" etc
            batch_ink = re.search(r"\bB\s*NO\.?\s*[:\-]?\s*([A-Z0-9\-/]{3,20})", norm, re.I)
            if batch_ink:
                mapped["batch_number"] = {"value": batch_ink.group(0).strip(), "inkjet": True}
            else:
                # Yet another dot-matrix: "BATCH NO. 1234 5678" may split across lines
                block = self._multi_line_block(norm, r"batch[^\\n]{0,10}", max_chars=60)
                if block and re.search(r"[A-Z0-9]{3,}", block):
                    mapped["batch_number"] = {"value": block.strip(), "inkjet": True, "multi_line": True}

        # ------------------------------------------------------------------
        # 14. Country of Origin (ecommerce)
        # ------------------------------------------------------------------
        coo = re.search(r"(?:country\s*of\s*origin|made\s*in)\s*[:\-]?\s*([A-Za-z\s]{3,30})", norm, re.I)
        if coo:
            mapped["country_of_origin"] = {"value": coo.group(0).strip()}

        # ------------------------------------------------------------------
        # 15. Per-field font height attachment (if detections supplied)
        #     Caller can pass OCR detections to enrich mapped fields with font heights
        # ------------------------------------------------------------------
        if detections:
            # Build quick lookup: text substring -> max font
            for key, data in mapped.items():
                val = data.get("value", "") if isinstance(data, dict) else str(data)
                if not val:
                    continue
                # Find detection whose text is contained in field value or vice versa
                candidates = []
                val_lower = val.lower()
                for det in detections:
                    txt = det.get("text", "").lower().strip()
                    if not txt:
                        continue
                    # fuzzy containment
                    if txt in val_lower or val_lower in txt or any(w in txt for w in val_lower.split()[:3]):
                        candidates.append(det)
                    # Also check bbox proximity via exact substring search in raw_text not feasible
                if candidates:
                    # Use max font among matched detections for this field
                    best = max(candidates, key=lambda d: d.get("font_height_mm", 0))
                    data["font_height_mm"] = best.get("font_height_mm")
                    data["bbox"] = best.get("bounding_box")
                    data["confidence"] = best.get("confidence")

        return mapped
