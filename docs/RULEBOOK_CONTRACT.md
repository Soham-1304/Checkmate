# Rulebook Contract — for the ML pipeline owner

How your extraction pipeline + rule data plug into the backend. Backend owns the rulebook compare
(`compliance_service.py`); your worker only extracts label fields from images (ARCHITECTURE §2).

## 1. What you POST (no backend change needed for new fields)

`PUT /api/v1/inspections/{id}/analysis-runs/{rid}/declarations` (officer JWT):

```json
{
  "declarations": [
    {
      "canonical_key": "mrp",
      "machine_value": "Rs 99 (incl. of all taxes)",
      "confidence": 0.93,
      "confidence_label": "HIGH",
      "bounding_box": {"x": 12, "y": 40, "width": 200, "height": 30},
      "font_size_mm": 4.5,
      "contrast_pass": true,
      "script_language": "ENGLISH",
      "clearance_pass": true,
      "evidence_id": "<uuid of the source image, optional>"
    }
  ],
  "raw_ocr_output": { "engine": "paddleocr", "anything": "you want to keep" }
}
```

- `canonical_key` MUST be one of the 12 keys in `RULEBOOK_v1.md` §3 (unknown keys → 422).
- `confidence` ∈ [0,1]; `<0.60` forces REVIEW (never FAIL) on requirements driven by that field.
- `script_language` ∈ `DEVANAGARI | ENGLISH | OTHER`. - Full run lifecycle: `POST .../analyze` → `QUEUED` → your PUT → `COMPLETED`/`FAILED`. Poll via
  `GET .../analysis-runs/{rid}`. Re-POSTing `analyze` while a run is QUEUED returns the existing run (200).

## 2. Dropping a new rule version (v2, yours)

1. Insert a new `rule_sets` row, e.g. version `LM-PCR-2011-v2.0`, with your `requirements` rows
   (`rule_ref`, `title`, `description`, `severity`, `applicable_to`, `check_logic`).
2. Each requirement's `check_logic` MUST use one of the known `type`s below — or extend
   `compliance_service.py` + document the new type here:

| check_logic.type | Needs from declarations |
|---|---|
| `address_completeness` | address text (+ `require_pincode`) |
| `field_present` | `field_key` non-empty |
| `si_unit_compliance` | value + SI unit, `forbidden_terms` |
| `date_validity` | `format`, `no_future_dates` |
| `mrp_format` | `require_taxes_inclusive` legend |
| `contact_completeness` | `require_phone`, `require_email` |
| `font_height_table_1` | `font_size_mm` (+ `tolerance_mm`) |
| `clearance_zone_check` | `clearance_pass` |
| `contrast_ratio_check` | `contrast_pass` (+ `min_contrast_ratio`) |
| `script_language_check` | `script_language` (+ `allowed`) |

3. Flip `is_active` to your version (exactly one active). Old inspections keep evaluating against
   their locked `rule_set_id` — history never shifts.
4. Tag your runs: `POST .../analyze` accepts `{"pipeline_version": "...", "model_version": "..."}`,
   stored on `analysis_runs` for traceability.

## 3. Read endpoints (version banner / debugging)

- `GET /api/v1/rule-sets` — all versions + requirement counts.
- `GET /api/v1/rule-sets/active` — active version with full requirements.
- `GET /api/v1/rule-sets/{id}` — any version (replay inspection history).
