# DoCA Backend Tracker — APIs + Storage for Admin Dashboard & RN Officer App

> **Team:** Backend only. **Consumers:** (A) Admin Dashboard web, (O) Officer React Native/Expo app.
> **Audit date:** 2026-09-07. **Refs:** `STATUS_AND_ROADMAP.md`, `ARCHITECTURE.md`, `UIUX_Design_Brief`.
> **Legend:** 🟢 DONE (live-ready) / 🟡 SCAFFOLDED (code exists, needs wiring/test) / 🔴 REMAINING.
> **Rule:** update on every backend change (append to Changelog §6).

## 0. Infra gate (do first — blocks both apps)

| # | Task | Status | Notes |
|---|---|---|---|
| B0.1 | Supabase Postgres live wiring (`DATABASE_URL`, pooler 6543 + `ssl=require`) | 🔴 REMAINING | You drop creds in `DoCA/.env`; config reads `.env` (`core/config.py:7-12`). asyncpg + pgbouncer needs `statement_cache_size=0` check |
| B0.2 | Alembic baseline (`versions/*.py`) + `upgrade head` on Supabase | 🔴 REMAINING | No migration files exist today |
| B0.3 | Run `seed_gazette.py` (rule set `LM-PCR-2011-v1.0` + field defs) + verify | 🟡 SCAFFOLDED | Script exists, never executed live |
| B0.4 | Smoke test: `/health`, `/api/v1/auth/login`, `/api/v1/dashboard/summary` | 🔴 REMAINING | Acceptance gate for frontend teams |
| B0.5 | CORS for web (`localhost:3000`) + RN (Expo Go, device IPs) | 🟡 SCAFFOLDED | Origins hardcoded in `core/config.py:21-26` — must become env-driven |

## 1. Auth & Users (both apps need; admin needs CRUD)

| Endpoint | Consumer | Status | File |
|---|---|---|---|
| `POST /api/v1/auth/login` (form) + `/login/json` | A+O | 🟡 SCAFFOLDED | `api/v1/auth.py:14-61` — needs live-DB verify |
| `GET /api/v1/auth/me` | A+O | 🟡 SCAFFOLDED | `auth.py:64-72` |
| `POST /api/v1/auth/refresh` (rotation) | O (long field sessions) | 🔴 REMAINING | No code. Decide: opaque refresh table vs longer JWT |
| `GET/POST/PATCH /api/v1/users` (create/list/deactivate officers, reset pw) | A | 🔴 REMAINING | No `users.py` router at all |
| Granular `permissions` check (beyond role-name strings) | A | 🔴 REMAINING | `deps.py:53-59` only checks names; `roles.permissions` JSONB unused |

## 2. Officer RN flow (O): checklist → new inspection → capture → review → result → submit

| Endpoint | Status | File / Gap |
|---|---|---|
| `GET /api/v1/assignments/my-checklist` (my tasks, due dates) | 🔴 REMAINING | Model exists (`workflow.py`), zero routes |
| `POST/GET /api/v1/assignments` (admin allocates, reassign, cancel) | 🔴 REMAINING | Needed so checklist has data |
| `GET /commodities/search?barcode=` + commodity/entity CRUD | 🔴 REMAINING | No `commodities.py` router; RN falls back to manual entry until this lands |
| `POST /api/v1/inspections` (draft, locks active rule set) | 🟡 SCAFFOLDED | `inspections.py:25-62` ✅ |
| `POST /api/v1/inspections/{id}/evidence` multipart (FRONT_PDP/BACK_PANEL/SIDE_PANEL) | 🟡 SCAFFOLDED | `evidence.py:24-76` — local disk only, 10MB limit? RN needs: max-size doc + presigned-URL alternative |
| `GET /api/v1/inspections/{id}/declarations` + `PATCH .../declarations/{did}` (officer correction, keep `machine_value`) | 🟡 SCAFFOLDED | `declarations.py` ✅ incl. audit |
| `POST .../evaluate` + `GET .../findings` + `PATCH .../findings/{fid}` (accept/note) | 🟡 SCAFFOLDED | `compliance.py` ✅ |
| `PATCH /api/v1/inspections/{id}` (physical_quantity/unit for MPE) | 🟡 SCAFFOLDED | Accepts fields, no MPE math (First Schedule 🔴) |
| `POST .../submit` (→ UNDER_REVIEW) | 🟡 SCAFFOLDED | `inspections.py:142-169` ✅ |
| `GET /api/v1/inspections?status=&limit=&offset=` (My Inspections; officers auto-scoped to self) | 🟡 SCAFFOLDED | `inspections.py:65-86` — needs pagination envelope + search for RN (`?q=`) |
| `GET /api/v1/dashboard/officer` (today's count, pending, completion %, activity) | 🔴 REMAINING | Nothing — RN mocks until then |

## 3. Admin Dashboard flow (A): dashboard → inspections → detail/review → violations → reports → history → users/rules

| Endpoint | Status | Gap |
|---|---|---|
| `GET /api/v1/dashboard/summary` (counts by status/result) | 🟡 SCAFFOLDED | `dashboard.py:12-49` ✅ basic |
| `GET /api/v1/dashboard/violations` (top clauses) | 🟡 SCAFFOLDED | `dashboard.py:52-65` ✅ |
| `GET /api/v1/dashboard/admin` (volume trend, compliance %, recidivism/repeat offenders, AI low-conf rate + override rate, workload/officer, geo by district/state) | 🔴 REMAINING | Biggest admin gap — build after B0 |
| `GET /api/v1/inspections/{id}` full detail (evidence+declarations+findings) | 🟡 SCAFFOLDED | `inspections.py:89-115` ✅ |
| `POST /api/v1/inspections/{id}/review` (APPROVED_COMPLIANT / NON_COMPLIANT / RETURNED) | 🟡 SCAFFOLDED | `inspections.py:172-217`, REVIEWER+ only ✅ |
| `POST /api/v1/inspections/{id}/report` + `GET .../report` (Form A/B PDF, WeasyPrint+Jinja2, embed images) | 🔴 REMAINING | No `reports.py` router |
| `GET /api/v1/repository/search` (brand, manufacturer, commodity, barcode, date, officer, violation) + CSV/Excel export | 🔴 REMAINING | No code |
| `GET /api/v1/audit-events?entity_type=&entity_id=` | 🔴 REMAINING | Events written (`INSPECTION_CREATED/SUBMITTED`, `EVIDENCE_UPLOADED`, `DECLARATION_CORRECTED`, `FINDING_REVIEWED`, `FINAL_DECISION_RECORDED`) but no query endpoint |
| Rules read-only (`GET /api/v1/rule-sets`, requirements) | 🔴 REMAINING | Version banner `LM-PCR-2011-v1.0` for admin UI |

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
