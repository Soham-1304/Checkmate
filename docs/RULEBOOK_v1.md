# Rulebook v1.0 — LM-PCR-2011 (our clean extraction)

> **Version:** `LM-PCR-2011-v1.0` (active) · **Source:** Legal Metrology (Packaged Commodities) Rules, 2011, GSR 202(E).
> **Status:** our working extraction (10 requirements). The ML owner's pipeline + rule data will land as a NEW version
> (see `RULEBOOK_CONTRACT.md`) — this file is then superseded, never edited in place.
> **Lives in DB:** `rule_sets` + `requirements` (seed: `backend/app/db/seeds/seed_gazette.py`).

## 1. Requirements (evaluated by `compliance_service.py`)

| # | rule_ref | Title | Severity | check_logic type | Driving declarations |
|---|---|---|---|---|---|
| 1 | Rule6(1)(a) | Manufacturer / Packer / Importer Complete Address | CRITICAL | `address_completeness` (PIN regex `\b[1-9][0-9]{5}\b`) | manufacturer_address, packer_address, names |
| 2 | Rule6(1)(b) | Common / Generic Name Declaration | MAJOR | `field_present` (generic_name) | generic_name |
| 3 | Rule6(1)(c) | Net Quantity in Standard Units | CRITICAL | `si_unit_compliance` (g/kg/ml/l/m/cm/N/U; bans approx/minimum/…) | net_quantity, net_quantity_unit |
| 4 | Rule6(1)(d) | Month and Year of Manufacture / Packing | CRITICAL | `date_validity` (MM/YYYY, no future) | mfg_date |
| 5 | Rule6(1)(e) | MRP Inclusive of All Taxes | CRITICAL | `mrp_format` (must contain "tax…inclusive" legend) | mrp |
| 6 | Rule6(2) | Consumer Care Grievance Details | CRITICAL | `contact_completeness` (phone and/or email) | consumer_care |
| 7 | Rule7_TableI | Minimum Font Height (≤200g→1mm, 200–500g→2mm, >500g→4mm, ±0.1mm) | CRITICAL | `font_height_table_1` | net_quantity (font_size_mm) |
| 8 | Rule8(1) | Free Space Around Net Quantity (1× height top/bottom, 2× sides) | MAJOR | `clearance_zone_check` | net_quantity (clearance_pass) |
| 9 | Rule9(1)(b) | Conspicuous Color Contrast | MAJOR | `contrast_ratio_check` (≥3.0) | mrp, net_quantity (contrast_pass) |
| 10 | Rule9(4) | Approved Script (Hindi Devanagari or English only) | CRITICAL | `script_language_check` | all declarations |

## 2. Global invariants (all versions)

1. **Low confidence → REVIEW, never FAIL** (`<0.60`, scoped to the requirement's driving declarations).
2. **Rule 3 bulk exemption** — physical pack >25 kg (or industrial/bulk notes) → Rule7/Rule8/Rule9(1)(b) = `NOT_APPLICABLE`, no findings.
3. **Rule-set version lock** — inspection stores `rule_set_id` at creation; replays use that exact version.
4. **`machine_value` immutable** — officer corrections go to `officer_value`; `final_value = COALESCE(officer_value, machine_value)`.

## 3. Canonical field catalog (12 keys)

`mrp`, `net_quantity`, `net_quantity_unit`, `mfg_date`, `expiry_date`, `generic_name`,
`manufacturer_name`, `manufacturer_address`, `packer_name`, `importer_name`,
`consumer_care`, `standard_pack_warning`.

## 4. Known gaps (owned later)

- **First Schedule MPE** math → B8. - **Second Schedule** standard pack sizes → B8 (`standard_pack_warning` key reserved).
- **Rule 10** import/brand-owner specifics (folded into 6(1)(a) for now). - **Rule 7 Table II** letter heights (folded into Table I check).
- **Seventh Schedule** Forms A/B → B6 reports.
