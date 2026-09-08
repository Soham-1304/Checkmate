# B6 — Auto-Generated Inspection Report (PDF) — Design Spec

Date: 2026-09-09. Status: APPROVED (single-template, auto every inspection).

## Goal
Every evaluated inspection automatically produces a neat, official-looking PDF report
(prototype-grade, our own layout — no official Form A/B specimen exists). The report is the
automation payoff of the pipeline: inspect → AI extract → rules evaluate → report ready.

## Decisions (user-confirmed)
- D1: One template now (`inspection_report.html.j2`); code structured for a second template later.
- D2: Auto-render inside `POST /inspections/{id}/evaluate` (re-evaluate = regenerate/overwrite).
- D3: Bucket `Bluetick_Report_Store` (already exists; `SUPABASE_BUCKET_REPORTS` already set in `.env`).
- D4: Reuse existing `reports` table (baseline-migrated: `inspection_id` unique, `file_key`,
  `file_url`, `report_format`, `generated_at`, `generated_by`). No new migration.

## Components
1. `app/services/report_service.py` — `render_inspection_report(db, inspection_id, actor) -> Report`.
   Gathers inspection + officer + commodity/brand/entity + evidence + declarations (machine vs
   officer value, confidence flags) + evaluations w/ requirement refs + findings + audit trail.
   Renders Jinja2 → WeasyPrint PDF → uploads `reports/{inspection_id}.pdf` → upserts `reports` row
   → writes `REPORT_GENERATED` audit. Evidence images fetched server-side (service key) and
   embedded as base64 data URIs, CSS-scaled thumbnails.
2. `app/services/report_templates/inspection_report.html.j2` — 8 sections: header+IDs,
   particulars, commodity, evidence, declarations, evaluations, findings, outcome+sign-off footer.
3. `app/api/v1/reports.py` — `GET /inspections/{id}/report` (metadata + presigned URL;
   lazy-generates if missing), `POST /inspections/{id}/report` (manual re-render).
   RBAC: `can_view_own_reports` (officer, own inspections) / `can_view_all_reports` (admin).
4. `evaluate` wiring — call `render_inspection_report` after evaluation commits; report failure
   must NOT fail the evaluation (log + audit, GET lazy-generates later).
5. `docs/REPORT_CONTRACT.md` — template context model (per arch §6.3).

## Risks
- WeasyPrint needs macOS system libs (pango/cairo via brew) + pip install. Verify before coding.
- Sync render adds ~1–2s to evaluate; acceptable for prototype (Celery later).
- `reports.file_url` stores presigned URL at render time (1h expiry) — GET regenerates fresh URL
  on read; stored value is fallback only.

## Acceptance
Live E2E: create → evidence → analyze → ingest → evaluate ⇒ report row auto-exists;
`GET .../report` ⇒ presigned URL ⇒ PDF bytes (`%PDF` header); officer-own scoping + admin OK;
full cleanup (DB rows + bucket object); tracker + commit B6.
