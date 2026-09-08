# DoCA Backend Tracker — APIs + Storage for Admin Dashboard & RN Officer App

> **Team:** Backend only. **Consumers:** (A) Admin Dashboard web, (O) Officer React Native/Expo app.
> **Audit date:** 2026-09-07. **Refs:** `STATUS_AND_ROADMAP.md`, `ARCHITECTURE.md`, `UIUX_Design_Brief`.
> **Legend:** 🟢 DONE (live-ready) / 🟡 SCAFFOLDED (code exists, needs wiring/test) / 🔴 REMAINING.
> **Rule:** update on every backend change (append to Changelog §6).

## 0. Infra gate (do first — blocks both apps)

| # | Task | Status | Notes |
|---|---|---|---|
| B0.1 | Supabase Postgres live wiring (`DATABASE_URL`, pooler 6543 + `ssl=require`) | 🟢 DONE | Live since B1 (pooler URL in `DoCA/.env`, `.env` copied to backend) |
| B0.2 | Alembic baseline (`versions/*.py`) + `upgrade head` on Supabase | 🟢 DONE | Baseline `88c640d9032f` + b3/b5 applied live |
| B0.3 | Run `seed_gazette.py` (rule set `LM-PCR-2011-v1.0` + field defs) + verify | 🟡 SCAFFOLDED | Script exists, never executed live |
| B0.4 | Smoke test: `/health`, `/api/v1/auth/login`, `/api/v1/dashboard/summary` | 🟢 DONE | Verified live every milestone (health 200 + logins) |
| B0.5 | CORS for web (`localhost:3000`) + RN (Expo Go, device IPs) | 🟡 SCAFFOLDED | Origins hardcoded in `core/config.py:21-26` — must become env-driven |

## 1. Auth & Users (both apps need; admin needs CRUD)

| Endpoint | Consumer | Status | File |
|---|---|---|---|
| `POST /api/v1/auth/login` (form) + `/login/json` | A+O | 🟢 DONE (B3: refresh pair issued) | `api/v1/auth.py` — live-DB verified, inactive blocked both paths |
| `GET /api/v1/auth/me` | A+O | 🟢 DONE | `auth.py` |
| `POST /api/v1/auth/refresh` (rotation) + `POST /auth/logout` | O (long field sessions) | 🟢 DONE (B3 live) | opaque sha256 tokens, `refresh_tokens` table (migration `b3_refresh_tokens`), reuse → chain revoked |
| `GET/POST/PATCH /api/v1/users` (create/list/deactivate officers, reset pw) | A | 🟢 DONE (B3 live) | `users.py` — `can_manage_users`, 409 dup, SUPERADMIN blocked, self-deactivate/role-change blocked |
| Granular `permissions` check (beyond role-name strings) | A | 🟢 DONE (B3 live) | `require_capability(*caps)` in `deps.py` reads `roles.permissions`; seeds aligned to §1.1 matrix |

## 2. Officer RN flow (O): checklist → new inspection → capture → review → result → submit

| Endpoint | Status | File / Gap |
|---|---|---|
| `GET /api/v1/assignments/my-checklist` (my tasks, due dates) | 🟢 DONE (B4 live) | `assignments.py` — officer-scoped, open-only default, due-date ordered |
| `POST/GET /api/v1/assignments` (admin allocates, reassign, cancel) | 🟢 DONE (B4 live) | `can_assign`; officer transitions guarded (ASSIGNED→IN_PROGRESS→COMPLETED), admin override, soft-cancel |
| `GET /commodities/search?barcode=` + commodity/entity CRUD | 🟢 DONE (B4 live) | `masters.py` — entities/brands/commodities CRUD + nested lists; barcode exact + q/category search; 409 dup barcode; officer read, `can_manage_master_data` write |
| `GET /api/v1/dashboard/officer` (today's count, pending, completion %, activity) | 🟢 DONE (B4 live) | today_count, my_pending_assignments, completion_rate, recent 5 |
| `POST /api/v1/inspections` (draft, locks active rule set) | 🟡 SCAFFOLDED | `inspections.py:25-62` ✅ |
| `POST /api/v1/inspections/{id}/evidence` multipart (FRONT_PDP/BACK_PANEL/SIDE_PANEL) | 🟢 DONE (live Supabase) | `evidence.py` → `storage_service` (mime+10MB cap, `<inspection>/<rand>.jpg`, presigned GET 1h); verified 200-byte fetch; test data cleaned |
| `GET /api/v1/inspections/{id}/evidence` (list) | 🟢 DONE | returns `file_key`/`file_url` (presigned when Supabase) |
| `GET /api/v1/inspections/{id}/declarations` + `PATCH .../declarations/{did}` (officer correction, keep `machine_value`) | 🟢 DONE | `declarations.py` ✅ incl. audit; B2 ingestion writes `machine_value` side |
| `POST .../analyze` + `GET .../analysis-runs/{rid}` + `PUT .../analysis-runs/{rid}/declarations` (ML async callback, officer JWT) | 🟢 DONE (B2 live) | `analysis.py` — QUEUED→RUNNING→COMPLETED/FAILED, strict 422 validation, evidence-required guard |
| `POST .../evaluate` + `GET .../findings` + `PATCH .../findings/{fid}` (accept/note) | 🟢 DONE (B2 live) | `compliance.py` + `compliance_service` — Rule 3 bulk applicability (NOT_APPLICABLE) + global low-conf<0.60→REVIEW |
| `PATCH /api/v1/inspections/{id}` (physical_quantity/unit for MPE) | 🟡 SCAFFOLDED | Accepts fields, no MPE math (First Schedule 🔴) |
| `POST .../submit` (→ UNDER_REVIEW) | 🟡 SCAFFOLDED | `inspections.py:142-169` ✅ |
| `GET /api/v1/inspections?status=&limit=&offset=` (My Inspections; officers auto-scoped to self) | 🟡 SCAFFOLDED | `inspections.py:65-86` — needs pagination envelope + search for RN (`?q=`) |
| `GET /api/v1/dashboard/officer` (today's count, pending, completion %, activity) | 🟢 DONE (B4 live, dup row) | See row 35 |

## 3. Admin Dashboard flow (A): dashboard → inspections → detail/review → violations → reports → history → users/rules

| Endpoint | Status | Gap |
|---|---|---|
| `GET /api/v1/dashboard/summary` (counts by status/result) | 🟡 SCAFFOLDED | `dashboard.py:12-49` ✅ basic |
| `GET /api/v1/dashboard/violations` (top clauses) | 🟡 SCAFFOLDED | `dashboard.py:52-65` ✅ |
| `GET /api/v1/dashboard/admin` (volume trend, compliance %, recidivism/repeat offenders, AI low-conf rate + override rate, workload/officer, geo by district/state) | 🟢 DONE (B5 live) | `dashboard.py` — runtime SQL, `can_view_admin_kpis`, `?days=` zero-filled trend |
| `GET /api/v1/inspections/{id}` full detail (evidence+declarations+findings) | 🟡 SCAFFOLDED | `inspections.py:89-115` ✅ |
| `POST /api/v1/inspections/{id}/review` (APPROVED_COMPLIANT / NON_COMPLIANT / RETURNED) | 🟡 SCAFFOLDED | `inspections.py:172-217`, REVIEWER+ only ✅ |
| `POST /api/v1/inspections/{id}/report` + `GET .../report` (Form A/B PDF, WeasyPrint+Jinja2, embed images) | 🟢 DONE (B6 live) | `reports.py` + `report_service` — auto-render on evaluate, `Bluetick_Report_Store`, fresh presigned URL per read |
| `GET /api/v1/repository/search` (brand, manufacturer, commodity, barcode, date, officer, violation) + CSV/Excel export | 🔴 REMAINING | No code |
| `GET /api/v1/audit-events?entity_type=&entity_id=` | 🔴 REMAINING | Events written (`INSPECTION_CREATED/SUBMITTED`, `EVIDENCE_UPLOADED`, `DECLARATION_CORRECTED`, `FINDING_REVIEWED`, `FINAL_DECISION_RECORDED`) but no query endpoint |
| Rules read-only (`GET /api/v1/rule-sets`, requirements) | 🟢 DONE (B3 live) | `rule_sets.py` — list/active/detail; version banner for admin UI; model-guy v2 surface |

## 4. Storage (both apps — RN is the stress case)

- **Today:** `POST .../evidence` writes `backend/uploads/<inspection>_<rand>.jpg`, returns `file_key=evidence/...`, `file_url=/uploads/...`, static mount in `main.py:40-41`. Valid mimes jpg/png/webp (`evidence.py:38-44`). No size cap, no MinIO SDK, no cleanup.
- **Target (Supabase):** buckets `doca-evidence` (private, presigned GET 1h for RN `<Image>`) + `doca-reports` (private, presigned for admin download). Keep `file_key`/`file_url` shape; add `upload_method: direct|presigned`, `expires_at`.
- **Tasks:** 🔴 storage client wrapper (`services/storage_service.py`) with local↔Supabase switch via env; 🔴 presigned upload path for big RN photos (camera 3–8MB); 🔴 mime+size validation shared; 🔴 report PDF put/get.

## 5. Risks

1. Supabase pooler + asyncpg prepared-statement clash → pin `statement_cache_size=0`, test under Expo parallel uploads.
2. RN multipart on cellular (timeouts) → add client timeout guidance + presigned PUT fallback; document in OpenAPI.
3. No refresh token → officers logged out mid-shift (24h expiry today) → ship refresh before field pilot.
4. Empty assignments/commodities tables → RN checklist + barcode search dead → seed demo data + ship those CRUDs early (order §7).

## 6. Build order for backend team

```
B0 infra (Supabase URL → Alembic → seed → smoke)        [unblocks everything]
B1 storage wrapper (local↔Supabase switch, presigned)    [unblocks RN capture]
B2 assignments + commodities/barcode + officer dashboard [unblocks RN home + new inspection]
B3 users CRUD + refresh + admin KPIs + audit query       [unblocks Admin web]
B4 reports (Form A/B) + repository search + export       [unblocks Admin reports/history]
B5 MPE + Second Schedule validators                      [compliance depth]
```

## 7. Changelog

- 2026-09-07: Tracker created. Backend audit: 6 routers (`auth, inspections, evidence, declarations, compliance, dashboard`), 0 routers for users/assignments/commodities/reports/repository/audit-query. Storage local-only.
- 2026-09-07: Q&A locked (Supabase Postgres+Storage only, private buckets + presigned URLs, refresh rotation, B0→B4). Shipped: env-driven CORS + `STORAGE_BACKEND` switch in `core/config.py`, `services/storage_service.py` (local↔Supabase, presigned URLs, 10MB cap), `supabase` dep, `.env.example` Supabase block, `SUPABASE_SETUP.md` paste guide. Next: drop `.env` creds → Alembic baseline → seed → smoke test.
- 2026-09-07: `.env` checked — file exists but EMPTY (0 lines), creds didn't land. Added `db/seeds/seed_demo.py`: 3 entities, 4 brands, 8 barcoded commodities (Biscuits/Tea/Atta/Oil/Soap/Coffee + 1 non-standard 333g demo), 5 officer assignments. Run order: `seed_gazette.py` then `seed_demo.py`.
- 2026-09-07: `.env` recheck — 6 lines: SUPABASE_URL + SERVICE_KEY + custom bucket names SET; DATABASE_URL/STORAGE_BACKEND/SECRET_KEY MISSING. Storage API: both buckets 404 (not created yet — create `doca-evidence`/`doca-reports` private, lowercase). Blocked on: pooler DATABASE_URL.
- 2026-09-07: Env key typo fixed (`DATABSE_URL` → `DATABASE_URL`); installed asyncpg/alembic/greenlet/jose/passlib; `session.py` auto-normalizes `postgresql://` → `+asyncpg`. CORRECTION: project ref IS valid — bucket list 200, `Bluetick_Image_Store` exists (private). Direct host `db.<ref>.supabase.co` NXDOMAIN on router + Google DNS (no direct hostname on this project) — using session pooler `aws-0-ap-south-1.pooler.supabase.com:5432` (wire-compatible, CONNECTED, PG 17.6).
- 2026-09-07: B0 LIVE — Alembic baseline applied (18 tables), `seed_gazette` (roles, 3 users, 12 fields, rule set + 10 requirements) + `seed_demo` (3 entities, 4 brands, 8 barcoded commodities, 5 officer assignments) all committed. Verified counts: users=3, commodities=8, assignments=5.
- 2026-09-07: `.env` cleaned — single canonical `DATABASE_URL` (session pooler 5432, real password, verified live: users=3, commodities=8, assignments=5, requirements=10).
- 2026-09-07: Git live in `DoCA/` — `.gitignore` (`.env` excluded, verified untracked), initial commit `5af89bd` (backend + Alembic baseline + seeds + trackers). Tree clean.
- 2026-09-07: Secret purge — real Supabase keys were in `.env.example` at commit time; rebuilt history as fresh root commit `96176b5`, gc'd dangling objects, verified zero `eyJ` in history. Never pushed, so keys are safe to keep.
- 2026-09-07: B1 DONE — evidence upload wired to live Supabase (`Bluetick_Image_Store`, presigned GET 1h). E2E verified: login → create inspection → multipart upload → signed URL fetch 200 (825B) → bucket+DB cleaned. Fixed: `backend/.env` missing (server fell back to `doca_admin@localhost`); copied canonical `.env`. Buckets use existing `Bluetick_*` names via env.
- 2026-09-07: B2 DONE — ML async-callback contract live (`analysis.py`, officer JWT): `POST .../analyze` (evidence-required guard, DRAFT→IN_PROGRESS, ANALYSIS_QUEUED audit), `GET .../analysis-runs/{rid}` poll, `PUT .../declarations` strict ingest (422 unknown key / conf range / script / bbox; upsert per field; COMPLETED+ANALYSIS_COMPLETED audit). `compliance_service`: Rule 3 bulk applicability pass (>25kg or industrial notes → Rule7/Rule8/Rule9(1)(b) NOT_APPLICABLE) + global low-conf<0.60 FAIL→REVIEW. E2E verified live (400 no-evidence, QUEUED→COMPLETED 6 decls, REVIEW on low-conf MRP, NOT_APPLICABLE ×3 at 30kg) → bucket+DB cleaned.
- 2026-09-07: B1–B2 AUDIT (6 fixes, all live-verified): F1 `GET inspection` built DeclarationOut manually — detail route returned `canonical_key/display_name: null` (from_attributes falls back to defaults); F2 moved key/evidence pre-validation before RUNNING flip (422s left runs dirty, FAILED never persisted) + ANALYSIS_FAILED audit; F3 scoped low-conf downgrade per-requirement driving keys (old code let ANY low-conf field soften ANY FAIL — proved: high-conf MRP FAIL now stays FAIL); F4 `login/json` missing `is_active` check (deactivated users could log in — now 400 both paths); F5 `evidence_id` must belong to inspection (422); F6 `analyze` reuses existing QUEUED run (200) instead of duplicates. Solid as-is: storage presign, guards, bulk exempt, re-evaluate cascade, SUPERADMIN bypass, inactive-token rejection.
- 2026-09-08: B3 DONE — RBAC capabilities + users + refresh + rulebook. `require_capability(*caps)` (`deps.py`, SUPERADMIN bypass) + seeds aligned to §1.1 matrix (live-updated). Users CRUD (`users.py`, `can_manage_users`): 201 create, list w/ role/active/q, get, patch (self-deactivate + self-role-change + SUPERADMIN-via-API blocked, 409 dup). Refresh rotation: `refresh_tokens` table (alembic `b3_refresh_tokens`, applied live), login issues pair, `/refresh` rotates, reuse → 401 + whole chain revoked, `/logout` 204. Rule-sets read (`rule_sets.py`: list/active/detail). Docs: `docs/RULEBOOK_v1.md` (clean 10-req extraction + gaps) + `docs/RULEBOOK_CONTRACT.md` (ingest schema, check_logic types, v2 drop-in). E2E live (403s, rotation, reuse-kill, 400/409/422 guards, logout) → test user cleaned (users=3).
- 2026-09-08: B4 DONE — assignments + master data + officer dashboard (14 routes). `masters.py`: entities/brands/commodities CRUD, nested brands/commodities, `search?barcode=` exact + `q`/`category` (search before `/{id}`), 409 dup barcode, 422 bad FK; officer read-only, `can_manage_master_data` write. `assignments.py`: `my-checklist` (open, due-ordered), admin allocate/list/reassign/cancel (soft), officer transitions ASSIGNED→IN_PROGRESS→COMPLETED enforced (422 bad jump), cancel-completed 400. `GET /dashboard/officer`: today_count, pending, completion_rate, recent 5. Fixed en route: double-wrapped `Depends()` broke router import. E2E live (403s, 409, 422, full lifecycle IN_PROGRESS→COMPLETED→reopen→CANCELLED) → test data cleaned (assignments=5, commodities=8 intact).
- 2026-09-08: B5 DONE — admin KPIs + indexes. `GET /dashboard/admin?days=` (`can_view_admin_kpis`): zero-filled volume trend, compliance+pass_rate, repeat offenders (HAVING>1), AI quality (low-conf/override rates), workload/officer, geo by state/district (JSONB), sectors w/ fail share. Migration `b5_kpi_indexes` (7 indexes, IF NOT EXISTS, applied live). Fixed en route: Postgres GROUP BY param quirk via labeled expressions. E2E live with 1 FAIL inspection (all 7 blocks correct, officer 403) → cleaned.
- 2026-09-09: B6 DONE — auto-generated inspection PDF report. `report_service` (context gather + Jinja2 + WeasyPrint 69, `inspection_report.html.j2` v1, 8 sections) + `reports.py` (GET lazy-generates, POST re-renders 201; `can_view_own_reports` + own/all scoping) + auto-render inside `evaluate` (non-fatal, returns `report_id`) + `REPORT_GENERATED` audit + `storage.download_bytes` helper + `docs/REPORT_CONTRACT.md` + spec `docs/superpowers/specs/2026-09-09-b6-inspection-report-design.md`. Fixed en route: storage_service line-join corruption, jinja2 `select_autoescape` name, pkill self-kill (bracket trick), WeasyPrint macOS libs (`brew install pango cairo gdk-pixbuf libffi glib` + `DYLD_FALLBACK_LIBRARY_PATH`). E2E live: evaluate→auto-report, officer/admin 200, 401/404 guards, presigned fetch 59KB valid 2-page PDF (all sections verified via text extraction) → cleaned (both buckets + rows). Tracker housekeeping: B0.1/B0.2/B0.4 + dup officer-dash rows flipped DONE.
