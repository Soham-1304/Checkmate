import pytest
from app.services.report_service import render_pdf

def test_pdf_rendering_success():
    context = {
        "template_version": "v1",
        "generated_at": "19-09-2026 14:00 IST",
        "inspection": {
            "id": "11111111-2222-3333-4444-555555555555",
            "status": "COMPLETED",
            "compliance_result": "PASS",
            "final_decision": "COMPLIANT",
            "location": "New Delhi, Delhi",
            "context_notes": "Sample verification test",
            "physical_sample": "1000 g",
            "created_at": "19-09-2026 10:00 IST",
            "submitted_at": "19-09-2026 10:30 IST",
        },
        "officer": {
            "name": "Legal Metrology Inspector",
            "employee_id": "IN-LM-999",
            "email": "inspector@gov.in",
        },
        "commodity": {
            "generic_name": "Sunflower Oil",
            "category": "EDIBLE_OIL",
            "barcode": "8901234567890",
            "sku": "OIL-1L",
            "package_type": "Bottle",
            "pack_size": "1 L",
        },
        "brand": "Fortune",
        "entity": {
            "legal_name": "Adani Wilmar Limited",
            "type": "MANUFACTURER",
            "address": "Fortune House, Ahmedabad",
        },
        "rule_set_version": "Legal Metrology Rules 2011",
        "evidence": [],
        "declarations": [
            {
                "field_code": "NET_QTY",
                "label": "Net Quantity",
                "raw_value": "1 L",
                "normalized_value": "1 L",
                "confidence": 0.98,
                "is_low_confidence": False,
                "font_size_mm": 4.0,
                "contrast_ratio": 9.2,
                "status": "VERIFIED",
            },
            {
                "field_code": "MRP",
                "label": "Maximum Retail Price",
                "raw_value": "₹ 165.00",
                "normalized_value": "165.00",
                "confidence": 0.94,
                "is_low_confidence": False,
                "font_size_mm": 3.5,
                "contrast_ratio": 8.1,
                "status": "VERIFIED",
            }
        ],
        "evaluations": [
            {"field_code": "NET_QTY", "status": "PASS", "score": 1.0, "findings_count": 0},
            {"field_code": "MRP", "status": "PASS", "score": 1.0, "findings_count": 0},
        ],
        "findings": [],
        "audit_trail": [],
    }

    pdf_bytes = render_pdf(context)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")


def test_pdf_rendering_with_violations():
    context = {
        "template_version": "v1",
        "generated_at": "19-09-2026 14:00 IST",
        "inspection": {
            "id": "22222222-3333-4444-5555-666666666666",
            "status": "COMPLETED",
            "compliance_result": "FAIL",
            "final_decision": "NON_COMPLIANT",
            "location": "Mumbai, Maharashtra",
            "context_notes": "Violation identified",
            "physical_sample": "250 g",
            "created_at": "19-09-2026 11:00 IST",
            "submitted_at": "19-09-2026 11:30 IST",
        },
        "officer": {
            "name": "Inspector Patel",
            "employee_id": "MH-LM-101",
            "email": "patel@gov.in",
        },
        "commodity": {
            "generic_name": "Potato Chips",
            "category": "PACKAGED_FOOD",
            "barcode": "8909876543210",
            "sku": "CHIP-50G",
            "package_type": "Pouch",
            "pack_size": "50 g",
        },
        "brand": "SampleBrand",
        "entity": {
            "legal_name": "Sample Foods Pvt Ltd",
            "type": "PACKER",
            "address": "Andheri East, Mumbai",
        },
        "rule_set_version": "Legal Metrology Rules 2011",
        "evidence": [],
        "declarations": [
            {
                "field_code": "MRP",
                "label": "Maximum Retail Price",
                "raw_value": "₹ 20.00",
                "normalized_value": "20.00",
                "confidence": 0.90,
                "is_low_confidence": False,
                "font_size_mm": 1.2, # Violates minimum font size
                "contrast_ratio": 2.1,
                "status": "VIOLATION",
            }
        ],
        "evaluations": [
            {"field_code": "MRP", "status": "FAIL", "score": 0.0, "findings_count": 1},
        ],
        "findings": [
            {
                "rule_id": "Rule 7",
                "explanation": "Font height 1.2mm is less than prescribed minimum 2.0mm for PDP area.",
                "legal_reference": "Rule 7, Legal Metrology (Packaged Commodities) Rules, 2011",
            }
        ],
        "audit_trail": [],
    }

    pdf_bytes = render_pdf(context)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")
