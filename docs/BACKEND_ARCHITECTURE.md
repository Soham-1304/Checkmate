# DoCA — Backend Architecture (PS-26034)

> **Status:** APPROVED (2026-09-07) · **Consumers:** Officer RN app + Admin dashboard
> **Supersedes:** nothing — this is the contract the backend team builds against.
> **Related:** `DoCA/ARCHITECTURE.md` (system blueprint + DDL), `DoCA/PLAN.md` (phased roadmap), `DoCA/BACKEND_TRACKER.md` (live done/remaining).

---

## 0. Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Roles enforced now | `OFFICER` + `ADMIN` (REVIEWER/SUPERADMIN in table, not guarded) | User said: 2 people, admin managers fleet, officer scans commodities |
| Reports | Backend renders official PDF (WeasyPrint) | Deterministic, legally consistent, frontend just streams it |
| KPI aggregation | Runtime SQL with targeted indexes | Demo volume small; correctness > premature caching; Redis deferred |
| ML ownership | Backend owns call + persist + rule compare | We hold rulebook; worker only extracts label fields from images |
| Analyze pattern | Async callback (worker POSTs structured results to our API) | Matches DRAFT→analyzing→declarations-ready lifecycle |
| Supabase role | Postgres + Storage only; FastAPI = system of record | No dual auth; service key server-side only |
| Evidence storage | Private Supabase bucket + presigned URLs | RN `<Image>` uses 1h signed URLs; no public exposure |

---

## 1. RBAC (Role-Based Access Control)

### 1.1 Roles & Capabilities

`roles.permissions` (JSONB) is the source of truth. Guard checks **capability keys**, not role names.

| Capability | OFFICER | ADMIN |
|---|---|---|
| `can_create_inspection` | ✅ | ✅ |
| `can_edit_own_inspection` | ✅ | ✅ |
| `can_review_all` | ❌ | ✅ |
| `can_finalize` | ❌ | ✅ |
| `can_manage_users` | ❌ | ✅ |
| `can_manage_master_data` | ❌ | ✅ (read for officer) |
| `can_assign` | ❌ | ✅ |
| `can_view_own_reports` | ✅ | ✅ |
| `can_view_all_reports` | ❌ | ✅ |
| `can_manage_rules` | ❌ | ✅ |
| `can_view_audit` | ❌ | ✅ |
| `can_view_admin_kpis` | ❌ | ✅ |

### 1.2 Mechanism (build order B3)

1. New dependency `require_capability(*caps)` in `app/deps.py`, layered **over** existing `require_roles`.
2. Every route declares the capability(s) it needs; role name is only a shortcut reference.
3. **Ownership scoping:** OFFICER always sees only rows where `officer_id == current_user.id` (already in `list_inspections`; extend to assignments/reports).
4. ADMIN = full visibility + write; REVIEWER/SUPERADMIN pass-through for future.

### 1.3 DB-level access

- Single Postgres DB. **No RLS.** Row gating enforced in the service layer (officer filters).
- Supabase `service_role` key lives in `DoCA/.env` only (never in repo, never in RN).
- Passwords bcrypt-hashed (existing `core/security.py`); JWT HS256 (existing).

---

## 2. Company → Brand → Commodity (Master Data)

### 2.1 Model (already exists in `app/models/master_data.py`)

```
BusinessEntity (MANUFACTURER / PACKER / IMPORTER / BRAND_OWNER)
   └── Brand
        └── Commodity  (barcode UNIQUE, category, standard_pack_size/unit, package_type)
```

### 2.2 Endpoints

```
# Admin-only write
POST   /api/v1/entities                 create business entity
GET    /api/v1/entities                 list (+ filter by type)
GET    /api/v1/entities/{id}            detail
PATCH  /api/v1/entities/{id}            update
GET    /api/v1/entities/{id}/brands     nested brands

POST   /api/v1/brands                   create brand (under entity)
GET    /api/v1/brands                   list
GET    /api/v1/brands/{id}/commodities  nested commodities
PATCH  /api/v1/brands/{id}

POST   /api/v1/commodities              create commodity
GET    /api/v1/commodities              list (+ category filter, paginated)
GET    /api/v1/commodities/{id}         detail
PATCH  /api/v1/commodities/{id}         update (incl. Second Schedule size)
GET    /api/v1/commodities/search       ?barcode= | ?q=<generic_name,brand> | ?category=
```

### 2.3 Rules

- **Barcode unique + indexed** → RN scans → prefilled inspection.
- **Second Schedule mapping:** `category` drives allowed `standard_pack_size`s. Non-standard size must set `standard_pack_warning` disclaimer (enforced in B8 validator).
- Officer has **read-only** access to master data (barcode lookup + category picker).

---

## 3. Officer Flow (RN App) — API Contract

### 3.1 Auth

| Method | Path | Body / Notes |
|---|---|---|
| POST | `/api/v1/auth/login` (form) | `username`=email, `password` → `{access_token, token_type, role, user_id, name}` |
| POST | `/api/v1/auth/login/json` | body `{email,password}` → same response as form login |
| GET | `/api/v1/auth/me` | `{id, name, email, role, employee_id}` |
| POST | `/api/v1/auth/refresh` | `{refresh_token}` → new access + refresh (rotation, B3) |

### 3.2 Assignments (B4)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/assignments/my-checklist` | officer's open tasks: commodity, due_date, priority, status |
| PATCH | `/api/v1/assignments/{id}/status` | claim / in-progress / complete |
| POST | `/api/v1/assignments` | ADMIN allocate (commodity→officer, due_date) |
| GET | `/api/v1/assignments` | ADMIN list (filter status/officer) |
| PATCH | `/api/v1/assignments/{id}` | reassign / update notes |
| DELETE | `/api/v1/assignments/{id}` | cancel (soft) |

### 3.3 Inspections (partial scaffold exists)

| Method | Path | Status |
|---|---|---|
| POST | `/api/v1/inspections` | 🟢 scaffold — locks active rule set |
| POST | `/api/v1/inspections/{id}/evidence` | 🟡 B1 rewires to Supabase storage |
| POST | `/api/v1/inspections/{id}/analyze` | 🔴 B2 — create analysis_run + async dispatch |
| GET | `/api/v1/inspections/{id}/analysis-runs/{rid}` | 🔴 B2 — status poll |
| PUT | `/api/v1/inspections/{id}/analysis-runs/{rid}/declarations` | 🔴 B2 — ML callback ingestion |
| GET | `/api/v1/inspections/{id}/declarations` | 🟢 scaffold |
| PATCH | `/api/v1/inspections/{id}/declarations/{did}` | 🟢 scaffold — officer correction, keeps machine_value |
| PATCH | `/api/v1/inspections/{id}` | 🟢 scaffold — physical_quantity/unit |
| POST | `/api/v1/inspections/{id}/evaluate` | 🟢 scaffold — runs compliance_service |
| GET | `/api/v1/inspections/{id}/findings` | 🟢 scaffold |
| POST | `/api/v1/inspections/{id}/submit` | 🟢 scaffold → UNDER_REVIEW |
| GET | `/api/v1/inspections` | 🟢 scaffold — add pagination envelope + officer filter |

### 3.4 Officer dashboard (B4)

```
GET /api/v1/dashboard/officer
→ { today_count, my_pending_assignments, my_completion_rate, recent_activity[] }
```

---

## 4. ML / Rulebook Contract (B2) — the core loop

```
RN uploads 2–3 images
  → POST /inspections/{id}/evidence          (persist → Supabase, returns file_keys)
  → POST /inspections/{id}/analyze           (creates analysis_run=QUEUED, async dispatch)
  → ML worker pulls file_keys, OCR + geometry (PaddleOCR/OpenCV)
  → worker PUT /analysis-runs/{rid}/declarations  (structured fields)
  → backend writes `declarations` rows (machine_value, confidence, bbox, font_mm, ...)
  → POST /inspections/{id}/evaluate          (rulebook compare → evaluations + findings)
  → RN shows PASS/FAIL/REVIEW + findings + evidence
```

### 4.1 Invariants (enforced)
1. **Immutable `machine_value`** — officer corrections write `officer_value`; `final_value = COALESCE(officer_value, machine_value)` (existing `evidence.py:85`). Audit `DECLARATION_CORRECTED`.
2. **Low confidence → REVIEW, never FAIL** — `compliance_service` already downgrades `<0.60` to REVIEW (`compliance_service.py:63-66`). Keep invariant across all checks.
3. **Rule-set version lock** — every inspection stores `rule_set_id` at creation; historical eval replay uses that exact rule set (SRS NFR-12/AC-10).
4. **Applicability before judgment** (SRS FR-08) — add applicability pass before PASS/FAIL/REVIEW (exemptions: Rule 3 >25kg industrial, package type, second-schedule scope).

### 4.2 ML callback validation

`PUT .../declarations` body strictly validated (Pydantic): allowed `field_definition` canonical keys, `confidence ∈ [0,1]`, booleans, `bbox` dict. Reject 422 on malformed; `analysis_run.status` QUEUED→RUNNING→COMPLETED/FAILED.

---

## 5. KPIs — Geo / Sector / Recidivism (B5, runtime)

`GET /api/v1/dashboard/admin` returns **all live, runtime-aggregated**:

| Block | SQL approach |
|---|---|
| Volume trend | `date_trunc('day', created_at)` GROUP BY, last N days |
| Compliance % | `compliance_result` split |
| Recidivism / repeat offenders | `findings JOIN commodities JOIN brand/entity` GROUP BY brand, HAVING count>1 |
| AI exception rate | low-confidence (`confidence<0.60` or REVIEW) + override rate (`is_corrected=true`) |
| Workload | inspections per officer |
| Geographic | `location->>'district'` / `->>'state'` GROUP BY |
| Sector | `commodity.category` GROUP BY |

**Indexes (B5 migration):** `inspections(created_at)`, `inspections(status)`, `inspections(compliance_result)`, `commodities(category)`, `findings(legal_reference)`.
**Redis:** deferred until QPS demands. Demo = correctness first.

---

## 6. Storage — Images & Reports (B1)

### 6.1 Evidence images

- Supabase private bucket `doca-evidence` (default `Bluetick_Image_Store` per user).
- Upload path: `evidence/` → object `{inspection_id}/{hash}.{ext}`.
- Backend returns `file_url = presigned GET (1h)`, `file_key = object name`.
- Local fallback (`STORAGE_BACKEND=local`) → `backend/uploads/` + `/uploads/*` static mount (existing).

### 6.2 Reports

- Backend renders official PDF via **WeasyPrint + Jinja2** (Form A/B templates **versioned in backend repo** — deterministic, self-contained).
- Store PDF → `doca-reports` bucket → `reports.file_key` + presigned `file_url` for admin download.
- Frontend **never assembles** the report; it streams the PDF bytes.

### 6.3 Template storage

- `backend/app/services/report_templates/Form_A.html`, `Form_B.html` (+ `.j2` counterpart) — in-repo, versioned with code.
- Template context model documented in `docs/REPORT_CONTRACT.md` (added with B6).

---

## 7. Build Order (each step = 1 commit)

| Step | Scope |
|---|---|
| **B1** | Storage wrapper + evidence → Supabase (upload, presign, local fallback) |
| **B2** | `analyze` + analysis-run ingestion + applicability pass + REVIEW invariants |
| **B3** | RBAC capability guard + users CRUD + refresh-token rotation |
| **B4** | Assignments + master-data CRUD + barcode search + officer dashboard |
| **B5** | Admin KPI aggregation + indexes |
| **B6** | Reports Form A/B (Jinja2 + WeasyPrint) + endpoints |
| **B7** | Repository search + CSV export + audit-trail query |
| **B8** | First Schedule MPE + Second Schedule validators |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `date_trunc` / `location->>` grouping slow at scale | targeted indexes; Redis fallback decision deferred |
| Malformed ML callback | strict Pydantic validation, 422/audit |
| ML worker down → inspection stuck QUEUED | timeout + FAILED + officer re-trigger |
| Ambition creep (REVIEWER workflows) | deferred post-demo; guard via capability, not work |
| Service key leak | `.env` only, git-ignored, scan in CI |

---

## 9. Acceptance (map to SRS)

| SRS | Covered by |
|---|---|
| FR-01/13/25 | §1 RBAC + audit endpoints (B3) |
| FR-02..04 | §3 inspections + masters (B1/B2/B4) |
| FR-05..07,09..12 | §4 ML contract + rulebook (B2) |
| FR-08 | applicability pass (B2) |
| FR-14..17 | findings + status lifecycle (existing + B2) |
| FR-18..21,26 | §6 reports + search/export (B6/B7) |
| FR-22 | §5 KPIs (B5) |
| FR-24 | rule-set version endpoints (B6 lock + B8) |