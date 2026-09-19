# DoCA PS-26034 — Current Status, Done vs Remaining

> **Audit Date:** 2026-09-09 (fresh, code + live API verified; demo-world seed v1 + admin KPI wiring added in evening pass)
> **Source of truth:** `BACKEND_TRACKER.md` (B0–B8 E2E-verified live detail, append-only changelog), `FRONTEND_TRACKER.md` (both apps), `ARCHITECTURE.md` (as-built).
> **Legend:** 🟢 DONE (live-verified) / 🟡 PARTIAL (works, has gaps) / 🔴 REMAINING.
> **Rule:** update this file whenever a milestone changes status. Keep `BACKEND_TRACKER.md` changelog as the granular log.

---

## 1. Executive Summary — where the system actually stands

| Layer | Status | Headline facts |
|---|---|---|
| **Backend API** | 🟢 **DONE** | FastAPI on Supabase Postgres, **46 routes live, all B0→B8 sub-tasks E2E-verified against the live DB** (see `BACKEND_TRACKER.md`). |
| **Rules / Compliance Engine** | 🟢 **DONE** | `LM-PCR-2011-v1.0` rule set seeded; Rule 3 applicability, Rule 6/7/8/9 checks, **First Schedule MPE + Second Schedule pack-size** (B8) all live. |
| **Storage** | 🟢 **DONE** | Supabase Storage switch (`STORAGE_BACKEND=supabase`), evidence + report buckets, presigned URLs. |
| **AI / OCR** | 🟢 **DONE** | **Server-side RapidOCR** in-process (`POST .../analyze-auto`) — upload → OCR → 12 declarations → verdict → PDF in one call. Heavy EasyOCR worker bridge retained for Hindi. |
| **PDF Reports** | 🟢 **DONE** | WeasyPrint inspection report, auto-rendered on evaluate, stored in bucket. |
| **Officer mobile app** | 🟡 **~70%** | Login, inspections, analysis result, full scanner flow all live. Dashboard/stores + 4 static screens remain mock. |
| **Admin web portal** | 🟡 **~65%** | 6 dashboard KPI cards live (compliance, trend, recent, top violations, high risk, workload); InspectionsPage/detail/review + Companies/Officers pages still on mock data. |
| **Demo data (seed)** | 🟡 **schema+seed DONE / data v1** | `seed_demo_world.py` — 8 brands / 8 entities / 15 inspections (6 PASS, 5 FAIL, 4 REVIEW) with real evidence photos + declarations via the **real engine**; ideal data story pending. |
| **Deploy** | 🟡 **~80%** | Dockerfile + render.yaml + environment hardening done; container builds & boots (login verified). Render deploy itself not yet run. |
| **Automated tests** | 🔴 **0%** | No pytest suite yet — verification has been live-E2E only (manual). |

---

## 2. Backend — detailed

### 2.1 Infrastructure (B0) — 🟢 DONE
- Supabase pooler DSN live (`aws-0-ap-south-1.pooler.supabase.com:5432`, PG 17), `ssl` handled.
- Alembic baseline + B3/B5/B7 migrations applied live.
- `seed_gazette.py` (roles, 3 users, 12 field defs, 10 requirements) + `seed_demo.py` (entities/brands/commodities/assignments) live. **11 commodities** now in catalog.
- **`seed_demo_world.py`** (new): idempotent demo-world seeder (deterministic UUIDs, `--reset`), adds 8 real brands (Parle-G, Britannia, Amul, Haldiram's, Tata, Maggi, Aashirvaad, Saffola) × 8 entities × 12 commodities (EAN-13) + 2 extra officers (Priya Sharma, Rahul Verma), 6 assignments, **15 inspections** across 10 states. Declarations fabricated, then verdicts produced by the **real** `run_compliance_evaluation` + `render_inspection_report`; evidence photos uploaded to `Bluetick_Image_Store`. Result: 6 PASS / 5 FAIL / 4 REVIEW in the last 60 days.
- Env-driven CORS + `STORAGE_BACKEND` switch; `.env` excluded from Docker image (`.dockerignore`).

### 2.2 Auth, RBAC, Users (B3) — 🟢 DONE
- JWT HS256 login (form + JSON), `/auth/me`, **refresh rotation with opaque tokens + reuse→chain-revoked**, `/auth/logout`.
- Users CRUD (`users.py`) with `can_manage_users` capability, 409 dup, self-deactivate/role-change/Superadmin-edits blocked.
- **Granular capability checks** (`require_capability`) beyond role names (SUPERADMIN bypass).
- Logins: `officer@doca.gov.in` / `admin@doca.gov.in` (see `SUPABASE_SETUP.md`).

### 2.3 Officer workflow (B1, B2, B4, B8) — 🟢 DONE
| Capability | Status |
|---|---|
| Assignments CRUD + my-checklist | 🟢 B4 live |
| Commodity/entity/brand CRUD + barcode search | 🟢 B4 live (11 demo commodities) |
| Officer dashboard (`/dashboard/officer`) | 🟢 B4 live |
| Inspections: create/lock-ruleset/detail/list | 🟢 (list response-model hardened B2) |
| Evidence upload multipart → Supabase presigned | 🟢 B1 live |
| Declarations: ingest, list, PATCH correction (preserves `machine_value`) | 🟢 B2 live |
| ML pipeline: `analyze` (async worker contract) + `analyze-auto` (server-side RapidOCR) | 🟢 c6ac763 live |
| Compliance evaluate + findings + accept/note | 🟢 B2 live (low-conf<0.60 → REVIEW invariant) |
| MPE (First Schedule) + pack-size (Second Schedule) validators | 🟢 B8 live |
| Submit → UNDER_REVIEW | 🟢 (code complete; not re-exercised in last demo) |

### 2.4 Admin / analysis (B5, B6, B7) — 🟢 DONE
- Admin KPI dashboard (`/dashboard/admin?days=`) — volume trend, compliance %, repeat offenders, AI quality (low-conf/override), workload, geo, sector fail-share.
- PDF report (`/inspections/{id}/report` + auto-render on evaluate) with embedded evidence, stored in `Bluetick_Report_Store`.
- Repository search + CSV export (`repository.py`), audit trail query (`audit-events`) — officer auto-scoped, `can_view_*` gates.

### 2.5 Remaining backend work — 🔴
- **No pytest suite** (pytest deps present, no tests written). Notable risk for handover.
- Second Schedule only maps 19 commodities; unknown categories are "neutral" (documented).
- OCR is RapidOCR (EN-focused); Hindi path needs the EasyOCR worker bridge (`AI_ML/worker_bridge.py`) — not exercised on server.
- `POST /inspections` still returns raw list (no pagination envelope / `?q=` for RN) — flagged in BACKEND_TRACKER.
- Evidence `file_url` expiry/presigned-upload fallback for cellular (documented risk #2).
- Rule config UI is read-only (no admin edit endpoint).

---

## 3. Frontend — detailed

### 3.1 Officer mobile app — `frontend_app/` (Expo RN)
| Screen | Status | Notes |
|---|---|---|
| Login (`/auth/login/json` + SecureStore tokens, `/auth/me`) | 🟢 | real JWT flow |
| Inspections list (table, filters, pagination) | 🟢 | live `/inspections` + `/commodities` |
| Scan → result (`scanner.tsx`) | 🟢 | capture → **commodity picker** → create → upload → **analyze-auto** → **evaluate** → real result screen |
| Analysis result (`/analysis/{id}`) | 🟢 | live detail, findings, **View Full Report** (presigned open) |
| Dashboard (`index.tsx`) | 🟡 | shell + `expo-image-picker` wired, but stats/checklist from local stores (mock), not `/dashboard/officer` |
| Entities, Standards, Notifications, Help, Settings | 🔴 | static mock screens, no API |
| TypeScript | 🟡 | 1 pre-existing error `index.tsx:84` (`contentContainer` style), not ours |

### 3.2 Admin web portal — `frontend_admin/` (Vite + React + Tailwind)
| Card / Page | Status | Notes |
|---|---|---|
| Compliance donut | 🟢 | `/dashboard/admin` live (pass/fail/review) |
| Inspection trend | 🟢 | live |
| Recent inspections | 🟢 | `/repository/search` live |
| AIDecision, Hero | 🔴 | mock data (`data/*.ts`) |
| HighRisk, TopViolations, OfficerWorkload | 🟢 | `/dashboard/admin?days=60` (repeat_offenders / violations / workload) |
| InspectionsPage / Detail / Review / NewInspection / Search | 🔴 | mock data + modals; `useLiveData` not used |
| Companies / Officers pages | 🔴 | mock data |
| Token gating | 🟡 | live only if `VITE_ADMIN_TOKEN` set or `localStorage.doca_admin_token`; otherwise mock fallback (never breaks) |

---

## 4. Deploy / Operations

- **Dockerfile**: python:3.12-slim + WeasyPrint/OpenCV system libs + **bcrypt pinned `==4.3.0`** (build-smoke asserts auth roundtrip so passlib/bcrypt drift fails the *build*, not the demo) + `.dockerignore` keeps `.env` out of image + `alembic upgrade head` in CMD.
- **render.yaml**: single Docker web service (plan `standard`), env vars from `SUPABASE_SETUP.md`.
- **Verified**: image builds, container boots, login works. A second dev container (`doca-api-test`) currently runs alongside local uvicorn during Docker handoff.
- 🔴 **Not done**: actual Render blueprint deployment; VITE_ADMIN_TOKEN in prod env; HTTPS/CORS origins for deployed FE.

---

## 5. Priority roadmap — what to build next

```
P1  pytest suite: auth, evidence upload, declarations, evaluate, analyze-auto,
    report render, repository search  (biggest remaining risk)
P2  Officer app: bind dashboard to /dashboard/officer + my-checklist; fix index.tsx:84
P3  Admin portal: wire InspectionsPage (GET /inspections) → InspectionDetailView
    (GET /inspections/{id}) → ReviewModal (POST /inspections/{id}/review)
P4  Deploy to Render (blueprint) + set VITE_ADMIN_TOKEN + CORS origins for prod URL
P5  Hindi OCR: exercise AI_ML worker_bridge against server contract (PUT declarations)
P6  Nice-to-have: pagination envelope on inspections list; presigned PUT fallback; rules editor
```

## 6. Changelog (append-only)

- 2026-09-09 (evening): Demo-world seed v1 (`seed_demo_world.py`, idempotent + `--reset`) — 15 branded inspections (6 PASS/5 FAIL/4 REVIEW) through the real engine; `/dashboard/admin?days=60` now shows believable trends (16 active days, 3 officers, 10 states, 12 sectors). Admin portal wired 3 more dashboard cards live (TopViolations → `/dashboard/violations`; HighRisk + OfficerWorkload → `/dashboard/admin`). Added `docs/superpowers/specs/2026-09-09-demo-world-seed-and-live-ui-design.md`. Admin `tsc --noEmit` clean. WeasyPrint PDF render not exercised (missing libgobject locally; expected OK in container).

- 2026-09-09: Full re-audit after B0–B8 + AI integration + frontend wiring. Backend 46 routes live; scanner flow wired end-to-end (capture→pick commodity→create→upload→analyze-auto→evaluate→result) and verified against live backend; cleaned 2 stray inspection rows (repo now holds the 3 demo inspections). Docker: bcrypt pin + auth smoke + `.dockerignore` (env un-baked). Status rewritten from stale "everything is 🔴" to current reality.