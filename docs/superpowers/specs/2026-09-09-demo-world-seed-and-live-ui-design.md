# Demo World — Authentic Seed Data + Live Admin/Officer UI — Design Spec

Date: 2026-09-09. Status: DRAFT (pending user review).

## Goal
Make the demo look real for SIH judges: (1) replace the generic seed catalog (Sunrise
Foods / FarmFresh / PackWell) with recognizable real brands and a believable
60-day compliance history; (2) make the admin dashboard, inspection detail + review,
and officer home tab **live** against the existing API. Approach A: seed first, wire
UI after. User-selected scope: real recognizable brands, ~8 brands / ~15 commodities /
~15 inspections, dashboard KPIs + inspection review top priority, reuse real evidence
photos.

## Grounding (verified live / in code)
- `/dashboard/admin?days=N` returns blocks: `volume_trend[] {date,count}`,
  `compliance {PASS,FAIL,REVIEW,PENDING,pass_rate}`, `repeat_offenders[]
  {brand_id,brand,entity,violations,inspections}` (HAVING violations>1),
  `ai_quality {total_declarations,low_confidence,low_confidence_rate,officer_overrides,override_rate,review_outcomes}`,
  `workload[] {officer_id,officer,total,completed}`, `geography {by_state[],by_district[]}`,
  `sectors[] {category,total,fails}` — `backend/app/api/v1/dashboard.py:122-255`.
- `/dashboard/violations` → `[{rule_reference,title,occurrences}]` (`dashboard.py:55-68`).
- `/dashboard/officer` → `{today_count,my_pending_assignments,my_completion_rate,my_total_inspections,recent_activity[]}`
  (`dashboard.py:71-119`).
- `GET /inspections` (list, `inspections.py:67`), `GET /inspections/{id}` (detail,
  `:91`), `GET /inspections/{id}/declarations|findings|evidence|report`, and
  `POST /inspections/{id}/review` guarded by `require_roles("REVIEWER","ADMIN","SUPERADMIN")`,
  decisions `APPROVED_COMPLIANT|APPROVED_NON_COMPLIANT|RETURNED_FOR_REVIEW`, requires
  status `UNDER_REVIEW` (`inspections.py:202-247`). `POST /evaluate` runs
  `run_compliance_evaluation()` and auto-renders the PDF report
  (`compliance.py:20`, `report_service.render_inspection_report`).
- `GET /assignments` and `/assignments/my-checklist` exist
  (`assignments.py:47,88`).
- Models: `Inspection`, `Assignment` (`workflow.py`); `Evidence`, `Declaration`,
  `AnalysisRun` (`evidence.py`); `ComplianceEvaluation`, `Finding`, `Report`,
  `AuditEvent` (`compliance.py`); `BusinessEntity`, `Brand`, `Commodity`,
  `FieldDefinition` (`master_data.py`); `User` (`user.py`); active `RuleSet`
  `LM-PCR-2011-v1.0` with 10 requirements (`seed_gazette.py:131-236`).
- Backend live on :8000 (46 routes). 3 real demo inspections exist (oats
  `8849bdcf-…`, lays `24c52be6-…`, amul `e4b0c898-…`, all REVIEW) — **kept as-is**;
  they add honest REVIEWs to KPIs.

## 1. Seed data — `backend/app/db/seeds/seed_demo.py` (v2, idempotent)

Adds real-looking yet clearly-demo rows; re-running is safe.

### 1.1 Entities (8 manufacturers, real brands, plausible metadata)
| Legal name | Type | State / City | Note |
|---|---|---|---|
| Parle Products Pvt Ltd | MANUFACTURER | Mumbai, Maharashtra | Parle-G |
| Britannia Industries Ltd | MANUFACTURER | Bengaluru, Karnataka | Marie Gold / Good Day |
| Gujarat Co-op Milk Mktg Fed Ltd (GCMMF) | MANUFACTURER | Anand, Gujarat | Amul |
| Haldiram Snacks Pvt Ltd | MANUFACTURER | Nagpur, Maharashtra | Haldiram's |
| Tata Consumer Products Ltd | MANUFACTURER | Mumbai, Maharashtra | Tata Tea / Tata Salt |
| Nestlé India Ltd | MANUFACTURER | Gurugram, Haryana | Maggi |
| ITC Ltd | MANUFACTURER | Kolkata, West Bengal | Aashirvaad |
| Marico Ltd | MANUFACTURER | Mumbai, Maharashtra | Saffola |

GSTINs/addresses/pincodes: format-plausible (e.g. `27AAACP2466J1Z5`),
**fabricated** — never claim real. Existing 3 fake entities remain untouched.

### 1.2 Brands → entity
Parle-G, Britannia, Amul, Haldiram's, Tata, Maggi, Aashirvaad, Saffola.

### 1.3 Commodities (~15, real-format EAN-13 `890…`, mapped categories)
Examples: Parle-G Glucose Biscuits 100g (BISCUITS), Britannia Marie Gold 200g
(BISCUITS), Amul Milk Chocolate 100g, Amul Butter 500g, Amul Taaza Milk 500ml (DAIRY),
Haldiram's Aloo Bhujia 200g (SNACKS), Tata Tea Gold 250g (TEA), Tata Salt 1kg (SALT),
Maggi 2-Minute Noodles 70g (NOODLES), Aashirvaad Sharbati Atta 5kg (ATTA),
Saffola Gold Oil 1L (EDIBLE_OIL). Each gets `generic_name`, `category` (maps to Second
Schedule per B8 mapping), `barcode`, `sku`, `package_type`, `standard_pack_size/unit`.
Full table frozen in source.

### 1.4 Users (+2 officers, no passwords change)
Priya Sharma (OFFICER, Delhi, `DOCA-OFF-203`), Rahul Verma (OFFICER, Bengaluru,
`DOCA-OFF-204`). Existing 3 users untouched → admin already satisfies
`require_roles("REVIEWER","ADMIN","SUPERADMIN")` for review flow.

### 1.5 Assignments (~8, spread over 3 officers)
Mixed `ASSIGNED`/`COMPLETED`/`IN_PROGRESS` with due dates → feeds `my-checklist`
and officer pending count.

### 1.6 Inspections (~15, spread over last 60 days, server time)
Deterministic fixed UUIDs (embedded in seed) → idempotent (skip if exists).
Mix (so every KPI is non-trivial):
- 5 COMPLETED / `PASS` / `APPROVED_COMPLIANT` (zero findings)
- 5 COMPLETED / `FAIL` / `APPROVED_NON_COMPLIANT` (1–2 findings each, legal refs from
  the 10 requirements, e.g. `Rule6(1)(e)` MRP, `Rule7_TableI` font, `Rule6(1)(c)` net qty,
  `First Schedule Table-I` MPE)
- 3 UNDER_REVIEW / `REVIEW` (findings pending adjudication, `officer_accepted=null`)
- 2 IN_PROGRESS / one PASS one REVIEW (mid-flow)

`location` JSONB varies: Delhi, Mumbai, Pune, Bengaluru, Nagpur, Anand, Gurugram,
Kolkata → real `geography` split. `physical_quantity` set on MPE-checked ones with
`context_notes` ("weighed 478g vs 500g declared", etc.). `submitted_at` on
UNDER_REVIEW+, `finalized_at` on COMPLETED.

### 1.7 Evidence — reuse real photos
Copy 3 bytes from `test_assets/{oats,lays,amul_chocolate}.png` via
`storage_service.upload_bytes` into `Bluetick_Image_Store` under
`evidence/<seed_inspection_id>_<n>.png`; distribute across 4–6 inspections
(`view_type` BACK_PANEL/FRONT_PDP/CLOSEUP). Other evidence rows reference those keys
so detail pages + PDF `<img>` render. The 3 existing real inspections keep their own
photos (no duplication of the live pipeline).

### 1.8 Declarations (12 per inspection, dual-value)
All 12 canonical `field_definitions` rows per judged inspection. Plausible
machine_value + officer_value; ~15–20% `is_corrected=True` with
`correction_reason` (drives `ai_quality.officer_overrides`); ~10–15% `confidence<0.60`
(drives REVIEW + low_confidence_rate); `font_size_mm`, `script_language`,
`contrast_pass` populated to match the verdict (small fonts on FAIL sniffing).

### 1.9 Compliance evaluations + findings
One `ComplianceEvaluation` per requirement (10) with `result`
PASS/FAIL/REVIEW/NOT_APPLICABLE + `eval_detail` trace; findings consistent with each
FAIL/REVIEW requirement. Severity CRITICAL/MAJOR, `legal_reference` matches
`Requirement.rule_ref`, `officer_accepted` set per status.

### 1.10 Reports — real PDFs
`report_service.render_inspection_report(db, id, actor_id)` for every inspection that
has a compliance_result → real WeasyPrint PDFs in `Bluetick_Report_Store`; "View Full
Report" opens. DRAFT inspections get none.

### 1.11 Audit trail
Events per inspection: CREATED → EVIDENCE_UPLOADED → ANALYSIS_COMPLETED →
COMPLIANCE_EVALUATED → REPORT_GENERATED → (SUBMITTED) → FINAL_DECISION_RECORDED,
actors = relevant user IDs, `reason` = short human note.

Runtime: direct ORM writes (fast) — no OCR runs during seed except the existing
3 inspections (already done). Target a one-shot run ≤ a few seconds.

## 2. Admin dashboard — KPIs fully live
`frontend_admin/src/api/useLiveData.ts` additions (live-with-mock-fallback, 60s
refresh, FAIL → mock; pattern per existing `useLiveCompliance`):
- `useLiveTopViolations()` → `GET /dashboard/violations`
- `useLiveAdminDashboard(days=30)` → `GET /dashboard/admin` (unwrap all blocks)

Card mapping (mock data remains as fallback when no token):
| Card | Source | Key fields |
|---|---|---|
| HeroSection / ComplianceDonut / Trend | already live | + `compliance.pass_rate` |
| TopViolationsCard | violations | rule_reference, title, occurrences |
| HighRiskCompaniesCard | repeat_offenders | brand, entity, violations, inspections |
| OfficerWorkloadCard | workload | officer, total, completed |
| AIDecisionCarousel | ai_quality + recent REVIEW inspections | low_confidence_rate, override_rate, review_outcomes |
| BenchmarkCard | compliance + ai_quality | pass_rate, review_outcomes |
| GeographyCard | geography | by_state, by_district |
| SectorFailShare | sectors | category, total, fails |

No layout/visual changes unless a card needs a no-token proof that is not already there.

## 3. Admin inspection detail + review — live
- `InspectionsPage`: list → new `useLiveInspections()` hook → `GET /inspections`
  (replace `INSPECTIONS_LIST_DATA` mock; verify status-chip rendering).
- `InspectionDetailView`: fetch `GET /inspections/{id}` +
  `/inspections/{id}/evidence|declarations|findings` (report via
  `/inspections/{id}/report`). Replace mock Evidence/Declarations/Finding cards with
  live ones (keep skeleton states).
- `ReviewModal` (Review buttons surface only for reviewer-capable role +
  `UNDER_REVIEW` status): `POST /inspections/{id}/review {decision, notes}` →
  reflect returned status/final_decision; confirm dialogs preserved.

## 4. Officer app home — live
- `frontend_app/app/(tabs)/index.tsx` dashboard tab: swap `statsStore` mock →
  `GET /dashboard/officer` (today_count, my_pending_assignments,
  my_completion_rate, my_total_inspections, recent_activity) and
  `GET /assignments/my-checklist` for the checklist list.
- Fix the pre-existing tsc error at `index.tsx:84` (`contentContainer` on a FlatList).

## Acceptance (live E2E, server on :8000)
1. Run seed once → run again → no duplicate rows (`counts` unchanged). 8 entities,
   8 brands, 15 commodities, 3 officers, ~8 assignments, ~15 inspections.
2. `/dashboard/admin?days=60` shows: trend with 5–8 active days, mixed
   compliance with pass_rate, repeat_offenders listing Parle/Britannia/…,
   workload for 3 officers, geography for 5+ states, sectors non-empty.
3. `/dashboard/violations` returns real rule refs sorted by count.
4. Admin (token): dashboard cards show real brands; open an UNDER_REVIEW inspection →
   photos + declarations + findings render, report opens (PDF); Review →
   APPROVED_NON_COMPLIANT → status COMPLETED, decision recorded (audit row).
5. Officer (token): home shows live today_count + checklist; `tsc` clean for changed
   files (only pre-existing unrelated errors may remain).
6. Cleanup scratch rows if the E2E created any; commit once per milestone (seed,
   admin, officer) after approval.

## Non-goals
Hindi OCR bridge; remaining officer static tabs (entities/help/settings); admin
Companies/Officers pages deeper wiring; new endpoints; migrations; real OCR for the
15 seeded inspections (declarations are fabricated-but-consistent, deliberately).