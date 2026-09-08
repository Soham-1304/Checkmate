import re
from typing import Dict, List, Tuple
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.compliance import ComplianceEvaluation, Finding
from app.models.evidence import Declaration
from app.models.master_data import Commodity
from app.models.rules import Requirement, RuleSet
from app.models.workflow import Inspection


LOW_CONF_THRESHOLD = 0.60

BULK_EXEMPT_REFS = ("Rule7", "Rule8", "Rule9(1)(b)")

# Requirement → declaration keys whose confidence gates its verdict.
# Rule9(4) scans every declaration (script is per-field), rest are scoped.
REQ_DRIVING_KEYS = {
    "Rule6(1)(e)": ("mrp",),
    "Rule6(1)(a)": ("manufacturer_address", "packer_address", "manufacturer_name", "packer_name", "importer_name"),
    "Rule6(1)(b)": ("generic_name",),
    "Rule6(1)(c)": ("net_quantity", "net_quantity_unit"),
    "Rule6(1)(d)": ("mfg_date",),
    "Rule6(2)": ("consumer_care",),
    "Rule7": ("net_quantity",),
    "Rule8": ("net_quantity",),
    "Rule9(1)(b)": ("mrp", "net_quantity"),
    "Rule9(4)": ("*",),
}


def _driving_keys(rule_ref: str) -> tuple:
    for prefix, keys in REQ_DRIVING_KEYS.items():
        if prefix in rule_ref:
            return keys
    return ("*",)


def _weight_grams(quantity, unit) -> float | None:
    try:
        q = float(quantity)
    except (TypeError, ValueError):
        return None
    u = (unit or "").lower()
    if u in ("kg", "kilogram", "kilograms"):
        return q * 1000.0
    if u in ("g", "gram", "grams"):
        return q
    if u in ("ml", "l", "cm", "m", "n", "u"):
        return None
    return None


def _is_bulk_exempt(inspection) -> bool:
    grams = _weight_grams(inspection.physical_quantity, inspection.physical_unit)
    if grams is not None and grams > 25000:
        return True
    notes = (inspection.context_notes or "").lower()
    return any(k in notes for k in ("industrial", "bulk pack", ">25kg", "> 25 kg", "25kg exemption"))


# --- B8: First Schedule (TABLE-I weight/volume + TABLE-II by-number) + Second Schedule ---
# Table values verbatim from RULES.md (First Schedule:468-482, Second Schedule:496-525).

# (upper bound in g-or-ml, kind, value). Boundaries: "up to 50" | "50 to 100" | ...
MPE_TABLE_I = [
    (50, "pct", 9),
    (100, "abs", 4.5),
    (200, "pct", 4.5),
    (300, "abs", 9),
    (500, "pct", 3),
    (1000, "abs", 15),
    (10000, "pct", 1.5),
    (15000, "abs", 150),
    (float("inf"), "pct", 1.0),
]


def _mpe_limit(declared: float) -> Tuple[float, str]:
    for upper, kind, val in MPE_TABLE_I:
        if declared <= upper:
            if kind == "abs":
                return val, f"First Schedule Table-I slab ≤{upper:g} g/ml (fixed {val:g})"
            limit = declared * val / 100.0
            limit = round(limit, 1) if declared <= 1000 else round(limit)
            slab = f"slab ≤{upper:g} g/ml ({val:g}%)" if upper != float("inf") else "slab above 15000 g/ml (1%)"
            return limit, f"First Schedule Table-I {slab}"
    raise AssertionError("unreachable")


def _qty_base(quantity, unit) -> float | None:
    """Declared/physical quantity in base units (g for mass, ml for volume)."""
    try:
        q = float(quantity)
    except (TypeError, ValueError):
        return None
    u = (unit or "").lower()
    if u in ("kg", "kilogram", "kilograms"):
        return q * 1000.0
    if u in ("g", "gram", "grams"):
        return q
    if u in ("l", "litre", "litres", "liter", "liters"):
        return q * 1000.0
    if u in ("ml", "millilitre", "millilitres", "milliliter", "milliliters"):
        return q
    return None


def _is_count_unit(unit) -> bool:
    return (unit or "").strip().upper() in ("N", "U")


def _parse_qty_number(text) -> float | None:
    try:
        return float(re.search(r"(\d+(?:\.\d+)?)", text or "0").group(1))
    except Exception:
        return None


def _is_multiple(qty: float, step: float) -> bool:
    return abs(qty / step - round(qty / step)) < 1e-9


# Second Schedule entries. Sizes in base units (g or ml — numbers are system-relative
# per RULES.md:512). fixed: explicit sizes; mult: (step, cap or None); free_below:
# quantities below pass freely (free_below_step constrains to multiples when set).
SECOND_SCHEDULE = [
    {"name": "Baby food", "match": ("baby",), "fixed": [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 5000, 10000]},
    {"name": "Weaning food", "match": ("weaning",), "fixed": [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 5000, 10000]},
    {"name": "Biscuits", "match": ("biscuit",), "fixed": [25, 50, 75, 100, 150, 200, 250, 300], "mult": (100, 1000)},
    {"name": "Bread", "match": ("bread",), "fixed": [100], "mult": (100, None)},
    {"name": "Butter and margarine", "match": ("butter", "margarine"), "fixed": [25, 50, 100, 200, 500, 1000, 2000, 5000], "mult": (5000, None)},
    {"name": "Cereals and Pulses", "match": ("cereal", "pulse", "dal", "lentil"), "fixed": [100, 200, 500, 1000, 2000, 5000], "mult": (5000, None)},
    {"name": "Coffee", "match": ("coffee",), "fixed": [25, 50, 100, 200, 250, 500, 1000], "mult": (1000, None)},
    {"name": "Tea", "match": ("tea",), "fixed": [25, 50, 100, 125, 250, 500, 1000], "mult": (1000, None)},
    {"name": "Beverage mixes", "match": ("beverage",), "fixed": [25, 50, 100, 125, 200, 500, 1000], "mult": (1000, None)},
    {"name": "Edible oils", "match": ("oil", "vanaspati", "ghee"), "fixed": [50, 100, 200, 500, 1000, 2000, 3000, 5000], "mult": (5000, None)},
    {"name": "Milk powder", "match": ("milk powder",), "fixed": [50, 100, 200, 500, 1000], "mult": (500, None), "free_below": 50},
    {"name": "Detergent powder", "match": ("detergent powder", "washing powder"), "fixed": [50, 100, 200, 500, 700, 1000, 1500, 2000], "mult": (1000, None), "free_below": 50},
    {"name": "Atta / flour", "match": ("atta", "flour", "rawa", "suji", "rice"), "fixed": [100, 200, 500, 1000, 2000, 5000], "mult": (5000, None)},
    {"name": "Salt", "match": ("salt",), "fixed": [50, 100, 200, 500, 750, 1000, 2000, 5000], "mult": (5000, None), "free_below": 50, "free_below_step": 10},
    {"name": "Laundry soap", "match": ("laundry",), "fixed": [50, 75, 100], "mult": (50, None)},
    {"name": "Detergent cake/bar", "match": ("detergent cake", "detergent bar"), "fixed": [50, 75, 100, 125, 150, 200, 250, 300], "mult": (100, None)},
    {"name": "Toilet soap", "match": ("toilet", "bath", "soap"), "fixed": [25, 50, 75, 100, 125, 150], "mult": (50, None)},
    {"name": "Aerated drinks", "match": ("aerated", "soft drink", "beverage_drink"), "fixed": [65, 100, 125, 150, 200, 250, 300, 330, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000]},
    {"name": "Mineral water", "match": ("mineral water", "drinking water"), "fixed": [100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000]},
    {"name": "Cement", "match": ("cement",), "fixed": [1000, 2000, 5000, 10000, 20000, 25000, 40000, 50000]},
    {"name": "Paint (liquid)", "match": ("paint liquid", "varnish", "enamel"), "fixed": [50, 100, 200, 500, 1000, 2000, 3000, 4000, 5000], "mult": (5000, None)},
    {"name": "Paint (paste/solid)", "match": ("paint paste", "paint solid"), "fixed": [500, 1000, 1500, 2000, 3000, 5000, 7000], "mult": (5000, None)},
    {"name": "Paint (base)", "match": ("paint base",), "fixed": [450, 500, 900, 925, 950, 975, 1000, 3600, 3700, 3800, 3900, 4000], "free_above": 4000},
]


def _match_schedule(category: str | None) -> dict | None:
    cat = (category or "").lower()
    for entry in SECOND_SCHEDULE:
        if any(k in cat for k in entry["match"]):
            return entry
    return None


def _is_standard_size(entry: dict, qty: float) -> bool:
    if entry.get("free_above") is not None and qty > entry["free_above"]:
        return True
    if entry.get("free_below") is not None and qty < entry["free_below"]:
        step = entry.get("free_below_step")
        return step is None or _is_multiple(qty, step)
    if any(abs(qty - f) < 1e-6 for f in entry.get("fixed", [])):
        return True
    mult = entry.get("mult")
    if mult and _is_multiple(qty, mult[0]):
        return mult[1] is None or qty <= mult[1]
    return False


def is_applicable(req, inspection, bulk_exempt: bool) -> bool:
    if bulk_exempt and any(r in req.rule_ref for r in BULK_EXEMPT_REFS):
        return False
    return True


async def run_compliance_evaluation(inspection_id: UUID, db: AsyncSession) -> Tuple[str, List[Finding]]:
    # 1. Fetch Inspection with declarations and active rule set
    stmt = (
        select(Inspection)
        .options(
            selectinload(Inspection.declarations).selectinload(Declaration.field_definition),
            selectinload(Inspection.rule_set).selectinload(RuleSet.requirements),
        )
        .where(Inspection.id == inspection_id)
    )
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found")

    # Map declarations by canonical key
    decl_map: Dict[str, Declaration] = {}
    for d in inspection.declarations:
        if d.field_definition:
            decl_map[d.field_definition.canonical_key] = d

    # 2. Clear prior evaluations and findings for clean re-run
    eval_stmt = select(ComplianceEvaluation).where(ComplianceEvaluation.inspection_id == inspection_id)
    existing_evals = (await db.execute(eval_stmt)).scalars().all()
    for e in existing_evals:
        await db.delete(e)
    await db.flush()

    findings: List[Finding] = []
    has_fail = False
    has_review = False
    bulk_exempt = _is_bulk_exempt(inspection)

    # 3. Evaluate each statutory requirement (applicability pass first)
    for req in inspection.rule_set.requirements:
        ref = req.rule_ref
        if not is_applicable(req, inspection, bulk_exempt):
            db.add(ComplianceEvaluation(
                inspection_id=inspection_id,
                requirement_id=req.id,
                result="NOT_APPLICABLE",
                eval_detail={"explanation": "Exempt under Rule 3 bulk/industrial pack (>25kg).", "bulk_exempt": True},
            ))
            await db.flush()
            continue

        result_status = "PASS"
        explanation = ""
        diag = {}
        finding_legal_ref = None

        # Rule 6(1)(e): MRP with "inclusive of all taxes"
        if "Rule6(1)(e)" in ref:
            mrp_decl = decl_map.get("mrp")
            if not mrp_decl or not mrp_decl.final_value:
                result_status = "FAIL"
                explanation = "Mandatory declaration of Maximum Retail Price (MRP) is completely missing from label."
            else:
                val = mrp_decl.final_value.lower()
                if "tax" not in val:
                    result_status = "FAIL"
                    explanation = "MRP declaration does not state mandatory 'inclusive of all taxes' phrase (Rule 6(1)(e))."
                elif mrp_decl.confidence and mrp_decl.confidence < 0.60:
                    result_status = "REVIEW"
                    explanation = f"Low OCR confidence ({float(mrp_decl.confidence):.2f}) for MRP reading. Requires officer confirmation."

        # Rule 6(1)(a) & 10: Complete Address with PIN code
        elif "Rule6(1)(a)" in ref:
            addr_decl = decl_map.get("manufacturer_address") or decl_map.get("packer_address")
            if not addr_decl or not addr_decl.final_value:
                result_status = "FAIL"
                explanation = "Manufacturer / Packer address is missing from the label."
            else:
                # 6-digit Indian PIN code regex
                has_pin = bool(re.search(r"\b[1-9][0-9]{5}\b", addr_decl.final_value))
                if not has_pin:
                    result_status = "FAIL"
                    explanation = "Address lacks a valid 6-digit Postal Index Number (PIN code) required by Rule 10."
                elif addr_decl.confidence and addr_decl.confidence < 0.60:
                    result_status = "REVIEW"
                    explanation = "Address extracted with low confidence. Verify complete factory premises and city."

        # Rule 6(1)(c): Net quantity and no misleading terms
        elif "Rule6(1)(c)" in ref:
            qty_decl = decl_map.get("net_quantity")
            unit_decl = decl_map.get("net_quantity_unit")
            if not qty_decl or not qty_decl.final_value:
                result_status = "FAIL"
                explanation = "Net quantity declaration is missing from the Principal Display Panel."
            else:
                val = (qty_decl.final_value + " " + (unit_decl.final_value if unit_decl else "")).lower()
                forbidden = ["approx", "approximately", "not less than", "minimum"]
                found_forbidden = [w for w in forbidden if w in val]
                if found_forbidden:
                    result_status = "FAIL"
                    explanation = f"Net quantity contains prohibited misleading word(s): '{', '.join(found_forbidden)}' (Rule 12(6))."
                elif unit_decl and unit_decl.final_value not in ["g", "kg", "ml", "l", "m", "cm", "N", "U"]:
                    result_status = "FAIL"
                    explanation = f"Unit '{unit_decl.final_value}' is not an approved SI unit symbol under Rule 13(5)."

                # B8a. First Schedule MPE — officer-weighed sample vs declared quantity.
                # Deficiency-only (Rules 19/21): excess is legal. No physical sample =
                # explicitly not verifiable (never a free pass, never a fail).
                b8_refs = []
                unit_val = unit_decl.final_value if unit_decl and unit_decl.final_value else ""
                declared_num = _parse_qty_number(qty_decl.final_value)
                physical_num = None
                try:
                    physical_num = float(inspection.physical_quantity) if inspection.physical_quantity is not None else None
                except (TypeError, ValueError):
                    physical_num = None
                if _is_count_unit(unit_val):
                    if physical_num is not None and declared_num:
                        short_pct = (declared_num - physical_num) / declared_num * 100.0
                        diag["mpe"] = {"declared": declared_num, "physical": physical_num, "short_pct": round(short_pct, 2), "limit_pct": 2}
                        if short_pct > 2.0:
                            result_status = "FAIL"
                            explanation = (explanation + " " if explanation else "") + (
                                f"Quantity short by {short_pct:.1f}% ({declared_num:g} declared vs {physical_num:g} found), "
                                "exceeding the 2% by-number maximum permissible error (First Schedule Table-II)."
                            )
                            b8_refs.append("First Schedule Table-II")
                    else:
                        diag["mpe"] = {"note": "no physical count recorded; MPE not verifiable"}
                else:
                    declared_base = _qty_base(declared_num, unit_val) if declared_num is not None else None
                    physical_base = _qty_base(physical_num, inspection.physical_unit) if physical_num is not None else None
                    if declared_base is None or physical_base is None:
                        diag["mpe"] = {"note": "no physical sample weighed; MPE not verifiable"}
                    else:
                        limit, slab = _mpe_limit(declared_base)
                        deficiency = declared_base - physical_base
                        diag["mpe"] = {
                            "declared": declared_base, "physical": physical_base,
                            "deficiency": round(deficiency, 2), "limit": limit, "slab": slab,
                        }
                        if deficiency > limit:
                            result_status = "FAIL"
                            explanation = (explanation + " " if explanation else "") + (
                                f"Net quantity short by {deficiency:g} g/ml ({declared_base:g} declared vs "
                                f"{physical_base:g} weighed), exceeding the permissible {limit:g} g/ml ({slab})."
                            )
                            b8_refs.append("First Schedule Table-I")

                # B8b. Second Schedule (Rule 5) — standard pack size for scheduled categories.
                if declared_num is not None and not _is_count_unit(unit_val):
                    commodity = (
                        await db.execute(select(Commodity).where(Commodity.id == inspection.commodity_id))
                    ).scalar_one_or_none()
                    declared_base = _qty_base(declared_num, unit_val)
                    entry = _match_schedule(commodity.category if commodity else None)
                    if entry is None:
                        diag["pack_size"] = {"note": f"category '{commodity.category if commodity else None}' not in Second Schedule; no standard-size requirement"}
                    elif declared_base is None:
                        diag["pack_size"] = {"note": "declared quantity unparseable; pack-size not verifiable"}
                    elif _is_standard_size(entry, declared_base):
                        diag["pack_size"] = {"entry": entry["name"], "declared": declared_base, "standard": True}
                    else:
                        disclaimer = decl_map.get("standard_pack_warning")
                        if disclaimer and disclaimer.final_value and disclaimer.final_value.strip():
                            diag["pack_size"] = {"entry": entry["name"], "declared": declared_base, "standard": False, "disclaimer": True}
                        else:
                            result_status = "FAIL"
                            explanation = (explanation + " " if explanation else "") + (
                                f"Pack size {declared_base:g} g/ml is not a Second Schedule standard size for "
                                f"{entry['name']}, and the label carries no 'Not a standard pack size' disclaimer (Rule 5 proviso)."
                            )
                            b8_refs.append("Rule 5 / Second Schedule")

                if b8_refs:
                    finding_legal_ref = "Rule6(1)(c); " + "; ".join(b8_refs)

        # Rule 6(1)(d): Month and Year of manufacture
        elif "Rule6(1)(d)" in ref:
            date_decl = decl_map.get("mfg_date")
            if not date_decl or not date_decl.final_value:
                result_status = "FAIL"
                explanation = "Month and year of manufacture/packing is missing from package."

        # Rule 6(2): Consumer care contact
        elif "Rule6(2)" in ref:
            care_decl = decl_map.get("consumer_care")
            if not care_decl or not care_decl.final_value:
                result_status = "FAIL"
                explanation = "Consumer care grievance redressal details (phone/email) are missing."
            else:
                has_phone = bool(re.search(r"\b(?:\+91|0)?[6-9]\d{9}\b|1800[-\s]?\d{3}[-\s]?\d{3,4}", care_decl.final_value))
                has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", care_decl.final_value))
                if not (has_phone or has_email):
                    result_status = "FAIL"
                    explanation = "Consumer care details must provide at least a telephone number or email address."

        # Rule 7 Table I: Font height in mm
        elif "Rule7" in ref:
            qty_decl = decl_map.get("net_quantity")
            if qty_decl and qty_decl.font_size_mm is not None:
                font_mm = float(qty_decl.font_size_mm)
                # Try parsing numeric net quantity
                qty_val = 100.0
                try:
                    qty_val = float(re.search(r"(\d+(?:\.\d+)?)", qty_decl.final_value or "0").group(1))
                except Exception:
                    pass

                required_min = 1.0 if qty_val <= 200 else (2.0 if qty_val <= 500 else 4.0)
                if font_mm < (required_min - 0.1):  # 0.1mm tolerance
                    result_status = "FAIL"
                    explanation = f"Net quantity numeral font height ({font_mm:.1f}mm) is smaller than required minimum ({required_min:.1f}mm) per Rule 7 Table I."
            else:
                result_status = "REVIEW"
                explanation = "Could not compute font height accurately from packaging photos. Verify with physical scale."

        # Rule 8(1): Free space around net quantity
        elif "Rule8" in ref:
            qty_decl = decl_map.get("net_quantity")
            if qty_decl and qty_decl.clearance_pass is False:
                result_status = "FAIL"
                explanation = "Area surrounding net quantity does not have mandatory clearance space (Rule 8(1))."

        # Rule 9(1)(b): Conspicuous Contrast
        elif "Rule9(1)(b)" in ref:
            mrp_decl = decl_map.get("mrp")
            if mrp_decl and mrp_decl.contrast_pass is False:
                result_status = "FAIL"
                explanation = "MRP or Net Quantity is printed without conspicuous color contrast against label background (Rule 9(1)(b))."

        # Rule 9(4): Script Language
        elif "Rule9(4)" in ref:
            # Check script languages
            non_compliant_langs = [
                d.script_language
                for d in decl_map.values()
                if d.script_language and d.script_language not in ["DEVANAGARI", "ENGLISH"]
            ]
            if non_compliant_langs:
                result_status = "FAIL"
                explanation = f"Mandatory declarations found in unauthorized script '{non_compliant_langs[0]}'. Must be Hindi or English."

        # Global invariant: low confidence → REVIEW, never FAIL.
        # Scoped to this requirement's driving declarations only, so an
        # unrelated low-confidence field can't soften another verdict.
        if result_status == "FAIL":
            keys = _driving_keys(ref)
            scoped = [d for k, d in decl_map.items() if "*" in keys or k in keys]
            low = next(
                (d for d in scoped if d.confidence is not None and float(d.confidence) < LOW_CONF_THRESHOLD),
                None,
            )
            if low is not None:
                result_status = "REVIEW"
                explanation = (explanation + " " if explanation else "") + (
                    "Downgraded to REVIEW: driving extraction confidence "
                    f"({float(low.confidence):.2f}) below {LOW_CONF_THRESHOLD:.2f}. Requires officer confirmation."
                )

        # 4. Save evaluation
        evaluation = ComplianceEvaluation(
            inspection_id=inspection_id,
            requirement_id=req.id,
            result=result_status,
            eval_detail={"explanation": explanation, "detail": diag} if diag else {"explanation": explanation},
        )
        db.add(evaluation)
        await db.flush()

        if result_status == "FAIL":
            has_fail = True
            finding = Finding(
                inspection_id=inspection_id,
                compliance_evaluation_id=evaluation.id,
                severity=req.severity,
                title=f"Non-Compliance: {req.title}",
                explanation=explanation,
                legal_reference=finding_legal_ref or req.rule_ref,
            )
            db.add(finding)
            findings.append(finding)
        elif result_status == "REVIEW":
            has_review = True
            finding = Finding(
                inspection_id=inspection_id,
                compliance_evaluation_id=evaluation.id,
                severity="MAJOR",
                title=f"Review Warranted: {req.title}",
                explanation=explanation,
                legal_reference=req.rule_ref,
            )
            db.add(finding)
            findings.append(finding)

    # 5. Determine Overall Compliance Result
    overall_result = "FAIL" if has_fail else ("REVIEW" if has_review else "PASS")
    inspection.compliance_result = overall_result
    await db.commit()

    return overall_result, findings
