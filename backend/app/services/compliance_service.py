import re
from typing import Dict, List, Tuple
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.compliance import ComplianceEvaluation, Finding
from app.models.evidence import Declaration
from app.models.rules import Requirement, RuleSet
from app.models.workflow import Inspection


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

    # 3. Evaluate each statutory requirement
    for req in inspection.rule_set.requirements:
        result_status = "PASS"
        explanation = ""
        diag = {}

        ref = req.rule_ref

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

        # 4. Save evaluation
        evaluation = ComplianceEvaluation(
            inspection_id=inspection_id,
            requirement_id=req.id,
            result=result_status,
            eval_detail={"explanation": explanation},
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
                legal_reference=req.rule_ref,
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
