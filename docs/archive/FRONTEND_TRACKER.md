# DoCA PS-26034 Frontend Tracker — Done vs Remaining

> **Source of truth:** `DoCA/STATUS_AND_ROADMAP.md` (2026-09-09 audit) + `DoCA/ARCHITECTURE.md` + UI/UX Brief
> **Updated:** 2026-09-09 | **Backend is LIVE since B3** — the old "backend not ready, use mocks" gate is gone.
> **Legend:** 🟢 DONE (wired to live API + typecheck) / 🟡 PARTIAL (works, mock or gaps) / 🔴 REMAINING.
> **Rule:** update on every frontend change. Repos: `frontend_app/` (Expo RN officer app), `frontend_admin/` (Vite+React admin).

## 0. Backend live-status (what FE can call TODAY)

All 🟢 live & verified on the running backend — see `BACKEND_TRACKER.md` B0–B8. Auth creds + env in `SUPABASE_SETUP.md`. Logins: `officer@doca.gov.in` / `admin@doca.gov.in`.

| Backend area | Status | Used by |
|---|---|---|
| Auth (login/json, me, refresh, logout) | 🟢 | both apps |
| Users CRUD + role capability guards | 🟢 | admin |
| Assignments CRUD + my-checklist | 🟢 | officer |
| Commodities/entities/brands CRUD + barcode search | 🟢 (11 commodities) | officer, admin |
| Inspections CRUD + evidence upload + declarations PATCH | 🟢 | officer |
| **analyze-auto** (server-side RapidOCR) + evaluate + findings | 🟢 | officer |
| Dashboard officer + admin (days=) | 🟢 | officer, admin |
| Report PDF (GET presigned) + repository search + CSV + audit | 🟢 | both |

## 1. Officer Mobile App — `frontend_app/` (Expo RN, expo-router, zustand, axios)

| Screen | Status | Backend used | Notes |
|---|---|---|---|
| Login | 🟢 | `/auth/login/json`, `/auth/me` | JWT in SecureStore; refresh on plan |
| Inspections (list, filters, pagination) | 🟢 | `/inspections`, `/commodities` | maps commodity ids → names |
| **Scanner (capture → result)** | 🟢 | `/commodities`, `POST /inspections`, `POST .../evidence`, `POST .../analyze-auto`, `POST .../evaluate` | commodity picker sheet; busy overlay; navigates to real result |
| Analysis result + findings + report | 🟢 | `/inspections/{id}`, `.../report` | "View Full Report" opens presigned PDF |
| Dashboard (home) | 🟡 | none yet — local `statsStore` mock | `expo-image-picker` import wired; `/dashboard/officer` not consumed |
| Entities | 🔴 | — | static screen |
| Standards | 🔴 | — | static screen |
| Notifications | 🔴 | — | static screen |
| Help / Settings | 🔴 | — | static screens |
| TypeScript | 🟡 | — | 1 pre-existing err `(tabs)/index.tsx:84` `contentContainer` |

**Wiring note:** API layer (`src/api/{client,endpoints,doca}.ts`) is complete — base URL via `EXPO_PUBLIC_API_BASE_URL` (default `http://10.0.2.2:8000/api/v1`), axios auth interceptor + retry, typed helpers for every flow.

## 2. Web Admin Portal — `frontend_admin/` (Vite + React + Tailwind + recharts)

| Area | Status | Backend used | Notes |
|---|---|---|---|
| Compliance donut | 🟢 | `/dashboard/admin?days=` | pass/fail/review segments |
| Inspection trend | 🟢 | `/dashboard/admin` | month-over-month |
| Recent inspections | 🟢 | `/repository/search?limit=` | row table |
| AIDecision / Hero | 🔴 | — | mock `data/*.ts` |
| HighRisk / TopViolations / OfficerWorkload | 🟢 | `/dashboard/admin`, `/dashboard/violations` | live-with-fallback |
| InspectionsPage / Detail / Review / NewInspection / Search | 🔴 | — | mock data + modals (endpoints exist!) |
| Companies / Officers pages | 🔴 | — | mock data (users/entities APIs exist!) |
| Token gating | 🟡 | `/auth` via `VITE_ADMIN_TOKEN` or `localStorage.doca_admin_token` | mock fallback when unset → UI never breaks |

`src/api/{client,useLiveData}.ts` provides `useLiveCompliance`, `useLiveTrend`, `useLiveRecent` with mock fallback — the pattern to extend to remaining pages.

## 3. Frontend build order (agreed)

```
F1 ✅  Stack + baseline (admin: Vite+React+Tailwind; officer: Expo RN) + shared API client
F2 ✅  Login real JWT (officer + admin token-gate)
F3 ✅  Inspections list + analysis result (live)
F4 ✅  Scanner end-to-end (capture→commodity→create→upload→analyze→evaluate→result)
F5 ✅  Live KPI donut/trend/recent (admin)
F6 ⏳  Officer dashboard live (/dashboard/officer + my-checklist); fix index.tsx:84
F7 ⏳  Admin detail/review/inspections/violations live
F8 ⏳  Deploy: EXPO_PUBLIC_API_BASE_URL + VITE_API_BASE_URL + VITE_ADMIN_TOKEN in prod
```

## 4. Changelog (append-only)

- 2026-09-07: Tracker created. No frontend code existed; backend gate said mocks.
- 2026-09-09: Backend fully live (B0–B8). Both app repos absorbed into `DoCA/`. Rewrote tracker to current reality.
- 2026-09-09 (evening): Admin portal — 3 more dashboard cards wired live-with-fallback in `useLiveData.ts` + cards: TopViolations → `GET /dashboard/violations`; HighRiskCompanies → `/dashboard/admin?days=60#repeat_offenders`; OfficerWorkload → `#workload`. Admin `tsc --noEmit` clean. F5 row now covers all 6 dashboard KPIs. Remaining F7: InspectionsPage (`GET /inspections`) → InspectionDetailView (`GET /inspections/{id}`) → ReviewModal (`POST /inspections/{id}/review`), per `docs/superpowers/specs/2026-09-09-demo-world-seed-and-live-ui-design.md`.
- 2026-09-10: Officer app assigned-inspect flow — scanner shows ONLY my-checklist assignments (brand+commodity+barcode+due); new inspect-confirm route (photo grid, metadata, INSPECT → create+upload×n+analyze-auto+evaluate+submit → UNDER_REVIEW → result screen). Fixed auth-token store mismatch (login wrote AsyncStorage, interceptor read SecureStore — app calls were tokenless). Officer topped to 5 assignments (dup Glucose cancelled). E2E live-verified (12 decls, REVIEW, PDF report). Checkmate rebrand: sidebar/search/tab-title/splash/login/app.json/package names; logo wired to frontend_app/assets/logo.png (file to be dropped in). Both tsc clean.
- 2026-09-10: Admin inspections live, mock-free — InspectionsPage rows from GET /inspections + per-row detail (real findings/confidence), metrics computed, offline banner instead of mock fallback; InspectionDetailView rewritten on GET /inspections/{id} (real evidence photos, findings, declarations, PDF report link); tab persisted in localStorage, default dashboard. Reconciled duplicate useLiveInspections/fmtDate with parallel edits. tsc clean.
