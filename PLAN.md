# DoCA — PS 26034 Step-by-Step Implementation Plan
## Automated Legal Metrology Inspection System (Edge-Ready, Local Stack)

> **Role:** Backend & Integration Lead / System Overseer  
> **Target:** SIH-2026 Problem Statement 26034 (Ministry of Consumer Affairs)

---

## 1. Phased Roadmap

```
  Phase 0: Environment & Foundation Setup
    └── Docker Compose (PostgreSQL 16 + Redis 7 + MinIO)
    └── Monorepo directory scaffold (backend, ai-worker, docs)

  Phase 1: Database & Core Models
    └── SQLAlchemy 2.0 Async Models (all 16 tables)
    └── Alembic migration baseline
    └── Gazette Rule Seed (LM-PCR-2011-v1.0 & Field Definitions)

  Phase 2: Backend API Scaffold (FastAPI)
    └── JWT RS256 Authentication & RBAC (Officer, Reviewer, Admin)
    └── Commodity & Assignment Management
    └── Inspection & Multi-Image Evidence Upload (/api/v1/inspections)

  Phase 3: Local AI & Vision Worker (ai-worker)
    └── OpenCV Geometry Engine (PDP detection, font height mm, contrast, clear space)
    └── PaddleOCR Local Engine (Bilingual Hindi + English text & bounding boxes)
    └── Tiered Semantic Extractor (High-precision Regex + Local Small SLM fallback)

  Phase 4: Statutory Compliance Engine
    └── Rule evaluator for Rule 6, 7 (Table I/II), 8, 9, 10, and Schedules
    └── PASS / FAIL / REVIEW logic & Finding generation

  Phase 5: Officer Workflow & Human-in-the-Loop
    └── Officer review & correction endpoint (preserving machine_value)
    └── Physical sample weight input & MPE comparison (First Schedule)
    └── Reviewer submission & Admin final decision workflow

  Phase 6: Statutory Report Generator & Audit Trail
    └── Gazette Form A / Form B (Seventh Schedule) Jinja2 PDF Generator
    └── Automated Audit Trail logging on all material actions
    └── Summary Dashboard metrics endpoint
```

---

## 2. Directory Structure in `DoCA/`

```
DoCA/
├── ARCHITECTURE.md          # Full architectural blueprint & DB schema
├── PLAN.md                  # This implementation plan
├── docker-compose.yml       # Local infrastructure (Postgres, Redis, MinIO)
├── .env.example             # Configuration template
│
├── backend/                 # FastAPI API Service
│   ├── app/
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── config.py        # Pydantic Settings
│   │   ├── deps.py          # Dependency injection (db, current_user)
│   │   │
│   │   ├── api/v1/          # REST route controllers
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── commodities.py
│   │   │   ├── assignments.py
│   │   │   ├── inspections.py
│   │   │   ├── evidence.py
│   │   │   ├── declarations.py
│   │   │   ├── compliance.py
│   │   │   ├── findings.py
│   │   │   ├── reports.py
│   │   │   ├── dashboard.py
│   │   │   └── audit.py
│   │   │
│   │   ├── models/          # SQLAlchemy 2.0 ORM tables
│   │   │   ├── user.py
│   │   │   ├── commodity.py
│   │   │   ├── assignment.py
│   │   │   ├── inspection.py
│   │   │   ├── evidence.py
│   │   │   ├── analysis_run.py
│   │   │   ├── declaration.py
│   │   │   ├── field_definition.py
│   │   │   ├── rule_set.py
│   │   │   ├── requirement.py
│   │   │   ├── compliance_evaluation.py
│   │   │   ├── finding.py
│   │   │   ├── report.py
│   │   │   └── audit_event.py
│   │   │
│   │   ├── schemas/         # Pydantic DTOs
│   │   ├── services/        # Business logic
│   │   │   ├── inspection_service.py
│   │   │   ├── compliance_service.py
│   │   │   ├── report_service.py
│   │   │   └── audit_service.py
│   │   │
│   │   └── db/
│   │       ├── session.py   # Async engine & sessionmaker
│   │       └── seeds/       # Gazette rules & field catalog seeds
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── ai-worker/               # 100% Local AI & Vision Microservice
│   ├── worker.py            # Celery task runner
│   ├── pipeline/
│   │   ├── preprocessor.py  # Blur detection, deskew, glare suppression
│   │   ├── cv_detector.py   # OpenCV: PDP area, font height mm, contrast, spacing
│   │   ├── ocr_engine.py    # PaddleOCR multilingual engine (Hindi + English)
│   │   ├── extractor.py     # Tier-1 Regex + Tier-2 Local SLM fallback
│   │   └── pipeline.py      # Master pipeline orchestrator
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend-web/            # Next.js 15 Admin Portal
└── mobile/                  # Flutter 3 Field Officer App
```

---

## 3. Step-by-Step Task Checklist

### Step 1: Local Docker Infrastructure
- [ ] Create `DoCA/docker-compose.yml` with:
  - `postgres:16-alpine` (Port 5432)
  - `redis:7-alpine` (Port 6379)
  - `minio/minio` (Port 9000 API, 9001 Web Console)
- [ ] Create `DoCA/.env.example`

### Step 2: Backend Scaffold & Database Migration
- [ ] Set up `DoCA/backend/requirements.txt` (FastAPI, SQLAlchemy async, asyncpg, alembic, pydantic, redis, celery, weasyprint).
- [ ] Implement async DB session in `backend/app/db/session.py`.
- [ ] Implement all 16 SQLAlchemy models matching the finalized DDL.
- [ ] Write seed script `seed_gazette_rules.py` containing the 12 core field definitions and the Gazette requirements (Rule 6, 7 Table I/II, 8, 9, 10, MPE Table).

### Step 3: Core API Endpoints
- [ ] Authentication (`POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`).
- [ ] Master Data CRUD (`/api/v1/commodities`, `/api/v1/assignments`).
- [ ] Inspection Lifecycle:
  - `POST /api/v1/inspections` (create draft locked to active rule set)
  - `POST /api/v1/inspections/{id}/evidence` (upload 2-3 images to MinIO)
  - `POST /api/v1/inspections/{id}/analyze` (dispatch async Celery job)
  - `GET /api/v1/inspections/{id}/declarations` (fetch machine extraction)
  - `PATCH /api/v1/inspections/{id}/declarations/{id}` (officer correction)
  - `POST /api/v1/inspections/{id}/evaluate` (run deterministic compliance engine)
  - `POST /api/v1/inspections/{id}/submit` (submit for admin review)
  - `POST /api/v1/inspections/{id}/report` (generate statutory PDF)

### Step 4: Local AI Worker Pipeline
- [ ] `preprocessor.py`: Laplacian variance blur check, perspective warp.
- [ ] `cv_detector.py`:
  - Contours for PDP detection and $cm^2$ area computation.
  - Character bounding boxes and font height in millimeters.
  - Text luminance vs background luminance contrast calculation.
  - Free space margin calculation around net quantity numeral.
- [ ] `ocr_engine.py`: PaddleOCR multilingual runner returning text, confidences, and script tag (`DEVANAGARI` vs `LATIN`).
- [ ] `extractor.py`:
  - Tier-1 regex pattern matcher for MRP, Net Quantity, Mfg Date, PIN Code, Phone, Email.
  - Tier-2 fallback model parser for complex multi-line entities.
- [ ] Connect pipeline output to database `declarations` and `analysis_runs` tables.

### Step 5: Compliance Engine
- [ ] Implement deterministic evaluators for:
  - Mandatory declarations completeness (Rule 6)
  - Font height vs declared net quantity bracket (Rule 7 Tables I & II)
  - Free space margin rule (Rule 8(1))
  - Conspicuous contrast (Rule 9(1)(b))
  - Valid script language (Rule 9(4))
  - PIN code and complete address (Rule 10)
  - Maximum Permissible Error tolerance calculation (First Schedule)
- [ ] Generate structured `findings` records with legal clause references.

### Step 6: Statutory Report Generator & Review Workflow
- [ ] Build Jinja2 HTML template matching **Form A / Form B (Seventh Schedule)** of the Gazette.
- [ ] Render PDF with WeasyPrint including packet images, annotated overlays, and violation itemization.
- [ ] Implement Admin review actions (`APPROVED_COMPLIANT`, `APPROVED_NON_COMPLIANT`, `RETURNED_FOR_REVIEW`).
- [ ] Verify automatic `audit_events` emission on every inspection status change and declaration edit.
