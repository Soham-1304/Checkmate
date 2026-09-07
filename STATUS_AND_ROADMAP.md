# DoCA PS-26034 Backend: Current Status, Scaffolding vs. Done, and Remaining Work

> **Audit Date:** September 2026  
> **Target Scope:** PS-26034 Backend & Database Layer (Ministry of Consumer Affairs / Legal Metrology)  
> **Audited Against:**
> - `docs/SIH - 2026/SIH26034_SRS 3d02491680008080aedec1229a2c668e.md`
> - `docs/SIH - 2026/DATABASE WORKFLOW PLANNING 3d124916800081a2acb7c7a234035e7e.md`
> - `docs/SIH - 2026/SIH26034_UIUX_Design_Brief 3d02491680008085951ffcdbf2cdde68.md`
> - `SIH_DATASET.pdf` (Gazette GSR 202(E))

---

## 1. Executive Summary: What is "Done" vs "Scaffolded" vs "Remaining"

| Category | Status | Definition in this Project |
|---|---|---|
| **DONE** | 🟢 **15%** | Architecture documents, Gazette rule extraction, data entity definitions, directory structure, and syntax-compiled Python code. |
| **SCAFFOLDED (Code Written, Needs Live Wiring/Expansion)** | 🟡 **35%** | FastAPI routes, SQLAlchemy models, Pydantic schemas, basic seeder script, and docker-compose file. These exist as code but are **not yet executed against a live DB, missing unit tests, and lack full business logic depth**. |
| **REMAINING (Not Yet Built)** | 🔴 **50%** | Full RBAC management, granular dashboard KPIs, assignment management, commodity/master data CRUD, advanced repository search, PDF report generator, and Alembic migrations. |

---

## 2. Detailed Component-by-Component Audit

### 2.1 Authentication & RBAC (Role-Based Access Control)
*Reference: SRS Section 4, 6 (FR-01), 13; UI/UX Brief Section 5*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| JWT Login (`/auth/login`, `/auth/login/json`) | 🟡 **SCAFFOLDED** | Route exists, parses credentials, issues JWT token. Needs live DB verification. |
| Fetch Profile (`/auth/me`) | 🟡 **SCAFFOLDED** | Basic user profile and role name returned. |
| Token Refresh (`/auth/refresh`) | 🔴 **REMAINING** | No refresh token issuance or rotation logic yet. |
| User Management CRUD (`/api/v1/users`) | 🔴 **REMAINING** | Admin cannot yet create officers, list users, deactivate accounts, or change passwords via API. |
| Granular Permission Matrix | 🟡 **SCAFFOLDED** | `Role.permissions` column exists as JSONB, but role checking in routes only checks role name strings (`"OFFICER"`, `"ADMIN"`), not granular capabilities (e.g. `can_reassign`, `can_modify_rules`). |
| Multi-Workspace Role Separation | 🔴 **REMAINING** | Need distinct route guards for **Officer Workspace** (mobile field routes) vs **Reviewer Workspace** (adjudication routes) vs **Admin Workspace** (system governance). |

---

### 2.2 Dashboards & KPI Analytics
*Reference: SRS Section 6 (FR-22), 12.2; UI/UX Brief Section 4 & 5*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Basic System Counts (`/dashboard/summary`) | 🟡 **SCAFFOLDED** | Returns total inspections, status breakdown, pass/fail counts. |
| Top Violation Clauses (`/dashboard/violations`) | 🟡 **SCAFFOLDED** | Groups findings by legal reference and counts occurrences. |
| **Officer Dashboard KPIs** (Mobile App view) | 🔴 **REMAINING** | **Missing entirely:**<br>• Today's inspections count<br>• My pending checklist / assigned commodities<br>• My completion rate & recent activity feed |
| **Admin Executive KPIs** (DOCA Web view) | 🔴 **REMAINING** | **Missing entirely:**<br>• Daily / Weekly inspection volume trend line data<br>• Compliance rate percentage (% pass vs % fail)<br>• **Recidivism / Repeat Offender KPI:** Brands/Manufacturers with repeated violations<br>• **AI Exception / Quality Monitoring KPI:** Rate of low-confidence extractions & manual officer overrides<br>• Inspector workload distribution (inspections per officer)<br>• Geographic breakdown (violations grouped by District / State from location metadata) |

---

### 2.3 Master Data & Commodity Catalog
*Reference: DB Planning Section 4, 11; SRS FR-04, FR-21*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Master Data Models (`BusinessEntity`, `Brand`, `Commodity`, `FieldDefinition`) | 🟡 **SCAFFOLDED** | SQLAlchemy models created with foreign keys. |
| Commodity CRUD APIs (`/api/v1/commodities`) | 🔴 **REMAINING** | No endpoints to create, update, or list commodities. |
| Business Entity / Manufacturer CRUD (`/api/v1/entities`) | 🔴 **REMAINING** | No endpoints to register manufacturers, packers, importers. |
| Barcode / SKU Instant Search (`/commodities/search?barcode=...`) | 🔴 **REMAINING** | Required for field officers scanning a barcode to auto-populate commodity metadata before photo capture. |
| Second Schedule Standard Size Mapping | 🔴 **REMAINING** | Data mapping of standard packaging sizes (e.g., Biscuits: 25g, 50g, 75g, 100g...) to commodity categories. |

---

### 2.4 Work Allocation & Assignments
*Reference: DB Planning Section 2, 5; SRS FR-02; UI/UX Brief Section 4*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Assignment Model | 🟡 **SCAFFOLDED** | Model exists with `assigned_by`, `assigned_to`, `due_date`, `status`. |
| Assignment CRUD APIs (`/api/v1/assignments`) | 🔴 **REMAINING** | Admin cannot yet assign commodities to officers, reassign tasks, set due dates, or cancel assignments. |
| Officer Checklist API (`/api/v1/assignments/my-checklist`) | 🔴 **REMAINING** | Mobile app needs an endpoint to fetch the logged-in officer's active assignments and priority tasks. |

---

### 2.5 Inspections & Evidence Workflow
*Reference: SRS FR-02, FR-03, FR-15, FR-16, FR-17; UI/UX Brief Section 3, 4, 5*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Inspection Model & Lifecycle | 🟡 **SCAFFOLDED** | States (`DRAFT`, `IN_PROGRESS`, `UNDER_REVIEW`, `COMPLETED`) modeled. |
| Create Draft Inspection (`POST /inspections`) | 🟡 **SCAFFOLDED** | Automatically locks to active rule set version (`LM-PCR-2011-v1.0`). |
| Multi-Image Evidence Upload (`POST /inspections/{id}/evidence`) | 🟡 **SCAFFOLDED** | Supports 2–3 photos (`FRONT_PDP`, `BACK_PANEL`, `SIDE_PANEL`) with disk fallback. |
| Declarations & Human Correction (`PATCH /declarations/{id}`) | 🟡 **SCAFFOLDED** | Corrects `officer_value` while preserving `machine_value` for evidentiary audit. |
| Submission (`POST /inspections/{id}/submit`) | 🟡 **SCAFFOLDED** | Moves inspection to `UNDER_REVIEW`. |
| Adjudication Review (`POST /inspections/{id}/review`) | 🟡 **SCAFFOLDED** | Admin records final decision (`APPROVED_COMPLIANT`, `APPROVED_NON_COMPLIANT`, `RETURNED_FOR_REVIEW`). |
| Evidence MinIO S3 SDK Integration | 🔴 **REMAINING** | Currently writing to local `/uploads` directory; MinIO client wrapper not yet wired. |
| Physical Measurement & MPE Calculation (First Schedule) | 🔴 **REMAINING** | Route accepts `physical_quantity`, but does not yet evaluate it against the Maximum Permissible Error table. |

---

### 2.6 Deterministic Statutory Compliance Engine
*Reference: SIH_DATASET.pdf; SRS FR-08, FR-09, FR-10, FR-11, FR-12, FR-14*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Rule Set & Requirement Models | 🟡 **SCAFFOLDED** | Models and seed data exist for 10 Gazette clauses. |
| Compliance Service (`run_compliance_evaluation`) | 🟡 **SCAFFOLDED** | Evaluates Rule 6(1)(e) (MRP), Rule 6(1)(a) (Address PIN), Rule 6(1)(c) (Net Qty SI units), Rule 7 (Font height), Rule 8 (Clearance), Rule 9 (Contrast & Script). |
| Dynamic Rule Applicability Engine | 🔴 **REMAINING** | Currently assumes general packaged commodity; need exemption handling (Rule 3: >25kg, industrial packaging exemptions). |
| First Schedule MPE Tolerance Math | 🔴 **REMAINING** | Formula to check if observed weight falls within permissible error % based on declared net quantity bracket. |
| Second Schedule Standard Pack Size Check | 🔴 **REMAINING** | Verification if commodity category must match prescribed sizes or declare the mandatory disclaimer. |

---

### 2.7 Statutory Reports & Official Repository
*Reference: SRS FR-18, FR-19, FR-20, FR-21, FR-26; Gazette Seventh Schedule*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Report Model | 🟡 **SCAFFOLDED** | Stores `file_key`, `file_url`, `generated_at`, `generated_by`. |
| Statutory PDF Generation Engine | 🔴 **REMAINING** | WeasyPrint / Jinja2 template matching **Form A (Weight Sheet)** and **Form B (Volume Sheet)** from the Gazette Seventh Schedule not yet coded. |
| Report Generation Endpoint (`POST /inspections/{id}/report`) | 🔴 **REMAINING** | Endpoint to compile and store the statutory report. |
| Report Download / Stream (`GET /inspections/{id}/report`) | 🔴 **REMAINING** | Endpoint for downloading the signed legal inspection report. |
| Advanced Repository Search (`/api/v1/repository/search`) | 🔴 **REMAINING** | Multi-faceted search filtering by Brand, Manufacturer, Commodity, Barcode, Date Range, Officer, and Violation Type. |
| Export to CSV / Excel | 🔴 **REMAINING** | Bulk export of inspection logs and violation analytics for departmental reporting. |

---

### 2.8 Audit Trail & System Integrity
*Reference: SRS FR-25; DB Planning Section 25*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| Audit Event Model | 🟡 **SCAFFOLDED** | Table captures `actor_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `reason`. |
| Automatic Event Logging | 🟡 **SCAFFOLDED** | Inline logging implemented for inspection creation, submission, review decisions, and declaration corrections. |
| Audit Trail Query Endpoint (`/api/v1/audit-events`) | 🔴 **REMAINING** | Admin endpoint to inspect the tamper-evident audit history of any commodity or inspection. |

---

### 2.9 Database Migrations & Environment
*Reference: Architecture Document Section 2*

| Feature / Requirement | Current Status | Notes & Gaps |
|---|---|---|
| `docker-compose.yml` (Postgres, Redis, MinIO) | 🟡 **SCAFFOLDED** | File written, ready to run. |
| Alembic Migrations | 🔴 **REMAINING** | Alembic initialized but migration files (`versions/*.py`) not yet generated or applied. |
| Automated Test Suite (`pytest`) | 🔴 **REMAINING** | Test directory created, but integration tests for auth, upload, and compliance not yet written. |

---

## 3. Priority Roadmap: What We Must Build Next

```
  STEP 1: DATABASE & LIVE INFRASTRUCTURE
    ├── Start PostgreSQL 16 & Redis via Docker Compose
    ├── Generate & apply Alembic initial migration
    └── Execute seed_gazette.py to verify real database tables

  STEP 2: FULL AUTH & USER MANAGEMENT (Complete RBAC)
    ├── Users CRUD API (/api/v1/users) — create/list/deactivate officers
    ├── Refresh token endpoint (/api/v1/auth/refresh)
    └── Granular permission checker (capabilities matrix)

  STEP 3: WORKFLOW & MASTER DATA
    ├── Commodity & Business Entity CRUD (/api/v1/commodities, /api/v1/entities)
    ├── Barcode lookup API (/commodities/search?barcode=...)
    └── Assignments API (/api/v1/assignments) — Admin allocation & Officer checklist

  STEP 4: ADVANCED DASHBOARD & KPI ANALYTICS
    ├── Officer Dashboard (/dashboard/officer) — today's tasks, pending checklist
    ├── Admin Executive Dashboard (/dashboard/admin) — volume trends, compliance %, recidivism
    └── Repeat Offender Analytics — top violating brands & manufacturers

  STEP 5: STATUTORY PDF REPORTS & REPOSITORY SEARCH
    ├── Jinja2 template for Gazette Form A / Form B
    ├── WeasyPrint PDF compiler with evidence image embedding
    ├── Report generation & download endpoints (/inspections/{id}/report)
    └── Multi-faceted Repository Search (/api/v1/repository/search)

  STEP 6: MPE & SCHEDULE ENHANCEMENTS
    ├── First Schedule MPE (Maximum Permissible Error) evaluation
    └── Second Schedule Standard Pack Size validator
```
