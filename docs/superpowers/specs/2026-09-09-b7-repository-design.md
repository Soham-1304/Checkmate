# B7 — Repository Search + CSV Export + Audit Query — Design Spec

Date: 2026-09-09. Status: APPROVED (CSV only, flat summary rows).

## Goal
Unlock the inspection archive: searchable history (admin history screen, oversight queries),
spreadsheet export (monthly reports, escalation files), and read access to the audit trail
(written since B1, never queryable until now).

## Decisions (user-confirmed)
- D1: Export CSV only (stdlib, streamed) — no openpyxl.
- D2: Flat summary rows (1 row/inspection; CSV maps 1:1).
- D3: Officers auto-scoped to own inspections (same rule as reports); cross-officer needs
  `can_view_all_reports`. Audit endpoint gated by `can_view_audit` (admin-only in practice).

## Components
1. `app/api/v1/repository.py`
   - `GET /repository/search` — filters `brand`, `manufacturer`, `commodity` (ilike),
     `barcode` (exact), `officer_id`, `result`, `violation` (=FAIL), `from_date`/`to_date`,
     `limit`/`offset` (conv: limit 50 ≤100). Returns `{items: [RepositoryRow], total}`.
   - `GET /repository/export` — same filters (no pagination; cap 5000 rows), streams
     `repository_YYYYMMDD.csv` via `StreamingResponse`.
   - `RepositoryRow`: inspection_id, created_at, submitted_at, status, compliance_result,
     final_decision, officer_id/name, commodity, brand, manufacturer, barcode,
     district, state, findings_count.
2. `app/api/v1/audit.py` — `GET /audit-events?entity_type=&entity_id=&action=&limit(100≤500)=`.
   Ordered oldest→newest (trail reads chronologically).
3. Migration `b7_search_indexes`: `commodities(generic_name)`, `brands(name)`,
   `business_entities(legal_name)`, `inspections(submitted_at)` (IF NOT EXISTS).

## Risks
- ilike filters won't use btree indexes at scale — acceptable for prototype volumes; pg_trgm later.
- Export cap 5000 rows keeps memory bounded (single StringIO; chunk later if needed).

## Acceptance
Live E2E on seeded FAIL inspection: each facet finds it; CSV parses with exact column set;
audit query returns full trail (CREATED→EVALUATED→REPORT_GENERATED); officer sees only own
(search + export), officer audit → 403; cleanup + commit.
