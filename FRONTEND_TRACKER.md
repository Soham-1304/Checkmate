# DoCA PS-26034 Frontend Tracker — Done vs Remaining

> **Source of truth:** `DoCA/STATUS_AND_ROADMAP.md` (Backend audit Sep 2026) + `docs/SIH - 2026/SIH26034_UIUX_Design_Brief` + `DoCA/ARCHITECTURE.md`
> **Updated:** 2026-09-07 | **Owner:** opencode + Soham
> **Rule:** Update this file on every frontend change. Keep statuses: 🟢 DONE / 🟡 SCAFFOLDED / 🔴 REMAINING.

## 0. Backend dependency map (what frontend can call TODAY)

| Backend endpoint | Status | Usable by frontend? |
|---|---|---|
| `POST /auth/login`, `/auth/login/json`, `GET /auth/me` | 🟡 Scaffolded, needs live DB check | Yes — after Supabase wiring |
| `GET /dashboard/summary`, `GET /dashboard/violations` | 🟡 Scaffolded | Yes — basic counts only |
| `POST /inspections`, `POST /inspections/{id}/evidence`, `PATCH /declarations/{id}`, `POST /inspections/{id}/submit`, `POST /inspections/{id}/review` | 🟡 Scaffolded (local /uploads, no MinIO, no MPE) | Yes — happy path only |
| `GET /dashboard/officer`, `GET /dashboard/admin`, `/api/v1/users`, `/api/v1/commodities`, `/api/v1/entities`, `/commodities/search?barcode=`, `/api/v1/assignments`, `/api/v1/assignments/my-checklist`, `/inspections/{id}/report`, `/api/v1/repository/search`, `/api/v1/audit-events`, Alembic, pytest | 🔴 Remaining | No — mock / stub on frontend until backend lands |

**Backend live-wiring gate:** Supabase Postgres URL in `.env` → Alembic migrate → `seed_gazette.py` → verify `/auth/login` + `/dashboard/summary`. Frontend uses mocks until then.

## 1. Web Admin Portal (`DoCA/frontend-web/`) — 🔴 0% (not scaffolded)

Reference: UI/UX Brief §5 — Dashboard, Inspections, Inspection Detail, Violations/Cases, Reports, History, Users & Roles, Rules/Config.

| Page | Status | Backend it needs | Notes |
|---|---|---|---|
| Login + JWT store + role guard (OFFICER/REVIEWER/ADMIN) | 🔴 REMAINING | `/auth/login`, `/auth/me` | First build; blocks all else |
| Admin Dashboard (counts, compliance %, trends, recidivism, workload, geo) | 🔴 REMAINING | `/dashboard/summary` ✅ today; `/dashboard/admin` 🔴 | Build with real summary + mocked advanced KPI cards |
| Inspections list (filter: date, product, status, officer, outcome) | 🔴 REMAINING | scaffolded list (check `inspections.py`) | — |
| Inspection Detail (images, declarations, findings, remarks, review actions) | 🔴 REMAINING | scaffolded review endpoints | Approve / Non-compliant / Return buttons |
| Violations / Cases | 🔴 REMAINING | `/dashboard/violations` ✅ today | — |
| Reports (generate Form A/B, download) | 🔴 REMAINING | `/inspections/{id}/report` 🔴 | Stub download button, mock PDF |
| Product/Inspection History + Repository search (brand, barcode, date, officer, violation) | 🔴 REMAINING | `/api/v1/repository/search` 🔴 | Mock filter UI first |
| Users & Roles CRUD | 🔴 REMAINING | `/api/v1/users` 🔴 | Mock table first |
| Rules / Configuration viewer | 🔴 REMAINING | `rule_sets` read-only | Read-only version banner `LM-PCR-2011-v1.0` |
| Shared: API client, auth context, layout, toasts, empty/error states | 🔴 REMAINING | — | — |

## 2. Officer Mobile App (`DoCA/mobile/`) — 🔴 0% (not scaffolded)

Reference: UI/UX Brief §4 — Login, Officer Dashboard, New Inspection, Capture/Upload, Review, Compliance Result, Violation Details, Submit, My Inspections.

| Screen | Status | Backend it needs | Notes |
|---|---|---|---|
| Login | 🔴 REMAINING | `/auth/login` | — |
| Officer Dashboard (today's, pending, quick New) | 🔴 REMAINING | `/dashboard/officer` + `/assignments/my-checklist` 🔴 | Mock checklist until backend lands |
| New Inspection (select commodity / barcode scan) | 🔴 REMAINING | `/commodities/search?barcode=` 🔴 | Manual entry fallback |
| Capture / Upload (2–3 images: FRONT_PDP, BACK_PANEL, SIDE_PANEL) | 🔴 REMAINING | `POST /inspections/{id}/evidence` 🟡 | Multipart upload |
| Inspection Review (confirm/correct declarations, preserve machine_value) | 🔴 REMAINING | `PATCH /declarations/{id}` 🟡 | Show confidence badge |
| Compliance Result (PASS/FAIL/REVIEW) + Violation Details | 🔴 REMAINING | compliance scaffold 🟡 | — |
| Submit + My Inspections | 🔴 REMAINING | submit 🟡 | — |

## 3. Frontend build order (agreed to confirm with you)

```
F1: Stack lock (Next.js 15 + TS? + Tailwind? + shadcn? — Q1 below)
F2: Scaffold frontend-web + API client + Login + role guard (unblocks all)
F3: Admin Dashboard (real summary, mocked advanced KPIs)
F4: Inspections list + Inspection Detail + Review actions
F5: Violations, Reports stub, History stub, Users stub, Rules read-only
F6: Mobile decision (full Flutter vs responsive PWA officer flow — Q2 below)
```

## 4. Open questions for you (answering unlocks F1–F2)

- [ ] Q1 Stack: keep ARCHITECTURE choice (Next.js 15 App Router + TS + Tailwind) or switch (Vite+React / other)? UI kit: shadcn/ui or plain Tailwind?
- [ ] Q2 Mobile: build Flutter app now, or ship responsive Next.js officer routes first for SIH demo speed?
- [ ] Q3 Data: Supabase = Postgres only (keep FastAPI as API), or also Supabase Auth/Storage? Where do `.env` creds go?
- [ ] Q4 Auth roles: OFFICER / REVIEWER / ADMIN / SUPERADMIN (per ARCHITECTURE §4) — confirm?
- [ ] Q5 Demo priority: which 3 web pages must shine for judges (suggest: Dashboard, Inspection Detail, Capture/Review)?

## 5. Changelog (append-only)

- 2026-09-07: Tracker created from STATUS_AND_ROADMAP + UIUX Brief + ARCHITECTURE. No frontend code exists yet.
