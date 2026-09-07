# DoCA — PS 26034 Architecture Document
## Legal Metrology (Packaged Commodities) Rules, 2011 Automated Inspection System

> **Architecture Style:** Edge-Ready, Sovereign, Offline-First System  
> **Target Problem Statement:** PS-26034 (Ministry of Consumer Affairs / Legal Metrology)  
> **Key Design Decision:** Zero Cloud LLM Dependency — 100% Local Small Models + Deterministic Vision & Rules

---

## 0. Architectural Principles & Rationales

| Requirement | Traditional Cloud AI Approach | **Our Offline-First Sovereign Approach (Chosen)** |
|---|---|---|
| **Field Operational Reality** | Fails in remote mandis, basement godowns, or rural areas without 4G/5G | **100% Local execution** — officers can inspect packages offline on edge devices/laptops |
| **Data Privacy & Sovereignty** | Sends sensitive enforcement evidence to foreign third-party cloud endpoints | **Complete Data Sovereignty** — zero packet evidence leaves the state/department infrastructure |
| **Operating Cost at Scale** | Expensive recurring API bills (per scan, per image) | **₹0 recurring inference cost** forever using lightweight open weights |
| **Legal Admissibility & Explainability** | Black-box LLM predictions prone to legal hallucinations | **Deterministic Rule Engine** — every violation maps strictly to Gazette clauses (Rules 6, 7, 8, 9, 10) |
| **Execution Latency** | 4–8 seconds (network upload + cloud queue + token generation) | **Sub-second to 1.5s total processing** on local CPU/commodity GPU |

---

## 1. System Technology Stack

```
                                  DOCA SYSTEM ECOSYSTEM
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                                  CLIENT LAYER                                   │
   │   • Field Officer Mobile App: Flutter 3 (Android / iOS)                         │
   │   • Web Administration Portal: Next.js 15 (App Router) + TypeScript             │
   └────────────────────────────────────────┬────────────────────────────────────────┘
                                            │ REST / Multipart Upload
                                            ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                               BACKEND API LAYER                                 │
   │   • Framework: FastAPI (Python 3.12, Async)                                     │
   │   • Authentication: JWT (RS256) with strict Role-Based Access Control (RBAC)    │
   │   • Database ORM: SQLAlchemy 2.0 (Async) + Alembic Migrations                   │
   │   • Task Broker & Pub/Sub: Redis 7                                              │
   │   • Report Engine: WeasyPrint / Jinja2 (Statutory Gazette Forms A & B)          │
   └────────────────────────────────────────┬────────────────────────────────────────┘
                                            │ Celery Task Queue
                                            ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                     AI/ML WORKER (100% LOCAL & OFFLINE)                         │
   │   • Geometry & Vision Engine: OpenCV (PDP area, Font height mm, Contrast, Space)│
   │   • Multilingual OCR Engine: PaddleOCR (Bilingual Hindi + English)              │
   │   • Tier-1 Semantic Parser: High-Precision Regex & Pattern Catalog              │
   │   • Tier-2 Semantic Extractor: Small Local Model (Quantized SLM / LayoutLM / NER)│
   └────────────────────────────────────────┬────────────────────────────────────────┘
                                            │ Structured Declarations
                                            ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                   STATUTORY COMPLIANCE & STORAGE LAYER                          │
   │   • Primary Database: PostgreSQL 16 (Relational Core + JSONB Extensibility)     │
   │   • Evidence Object Store: MinIO (Local S3-compatible)                          │
   │   • Rule Engine: Deterministic Python evaluator locked to Gazette version       │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Local AI & Computer Vision Pipeline

```
  [2 to 3 Images: Front PDP, Back Panel, Side/MRP-Date Panel]
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 1. PREPROCESSOR (preprocessor.py)                       │
  │    • Perspective correction, shadow removal, glare mask  │
  │    • Sharpness / blur score validation (Laplacian variance)│
  └────────────────────────────┬────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
  ┌───────────────────────────────┐     ┌───────────────────────────────┐
  │ 2. OPENCV GEOMETRY ENGINE     │     │ 3. PADDLEOCR ENGINE           │
  │    (cv_detector.py)           │     │    (ocr_engine.py)            │
  │    • PDP detection & Area     │     │    • Multilingual text detect │
  │    • Bounding boxes (x,y,w,h) │     │    • English & Hindi reading  │
  │    • Font Height in mm        │     │    • Token-level coordinates  │
  │    • Conspicuous contrast     │     │    • Character confidences    │
  │    • Clear zone around Net Qty│     │    • Script tagging           │
  └───────────────┬───────────────┘     └───────────────┬───────────────┘
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 4. TIERED SEMANTIC STRUCTURING (extractor.py)           │
  │                                                         │
  │   [Tier 1: Deterministic Pattern & Regex Engine]        │
  │   • MRP: `r"MRP\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d{2})?)"`   │
  │   • Net Qty: `r"(\d+(?:\.\d+)?)\s*(g|kg|ml|l|N|U)\b"`  │
  │   • Mfg Date: `r"\b(0[1-9]|1[0-2])[\/\-](20\d{2})\b"`  │
  │   • PIN Code: `r"\b[1-9][0-9]{5}\b"`                   │
  │   • Consumer Phone: `r"(?:1800|0?\d{2,4})[-\s]?\d{6,8}"│
  │   • Consumer Email: RFC 5322 regex                     │
  │         │                                               │
  │         ├──► Confidence >= 0.90? ──► Accepted           │
  │         │                                               │
  │   [Tier 2: Small Local SLM Fallback (e.g. Qwen2.5-0.5B/ │
  │            LayoutLMv3 / SpaCy NER on ONNX)]             │
  │   • Resolves messy multi-line addresses                 │
  │   • Distinguishes "Mfg by" vs "Pkd by" vs "Imported by" │
  │   • Extracts generic commodity name from slogans        │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │ 5. DATABASE PERSISTENCE                                 │
  │    • Writes to `analysis_runs` (raw OCR + model version) │
  │    • Writes to `declarations` (machine_value, bbox, mm)  │
  │    • Signals completion to Redis Pub/Sub                │
  └─────────────────────────────────────────────────────────┘
```

---

## 3. Statutory Compliance Engine (100% Deterministic)

The compliance engine runs inside `compliance_service.py`. It takes the structured declarations and evaluates them against the versioned rules from **`SIH_DATASET.pdf`**:

| Gazette Provision | Legal Requirement | Technical Evaluator | Logic & Pass/Fail Criteria |
|---|---|---|---|
| **Rule 6(1)(a) & 10** | Manufacturer / Packer / Importer Complete Address | Python Regex + State Validator | Must contain building/premises, city, state, and a valid 6-digit PIN code. |
| **Rule 6(1)(b)** | Common or Generic Name | Dictionary / Field Matcher | Must be declared prominently on the Principal Display Panel (PDP). |
| **Rule 6(1)(c), 12, 13** | Net Quantity in SI Units | Regex & SI Symbol Normalizer | Units must be `g`, `kg`, `ml`, `l`, `m`, `cm`, `N`, or `U`. Forbidden misleading terms: *"approx"*, *"minimum"*, *"not less than"*. |
| **Rule 6(1)(d)** | Month & Year of Packing/Mfg | Date Normalizer | Format: `MM/YYYY` or Month in words; cannot be post-dated. |
| **Rule 6(1)(e)** | Retail Sale Price (MRP) | Pattern Matcher | Must state `"incl. of all taxes"`; validates rounding to nearest 50 paise. |
| **Rule 6(2)** | Consumer Care Grievance Details | Multi-field Validator | Must provide name/office, address, telephone number, and email. |
| **Rule 7 Table I & II** | **Minimum Font Height of Numerals & Letters** | OpenCV Measurement Engine | Evaluates numeral height in mm against declared net quantity:<br>• $\le 200\text{g/ml} \implies \ge 1.0\text{mm}$ (blown: $2.0\text{mm}$)<br>• $200–500\text{g/ml} \implies \ge 2.0\text{mm}$ (blown: $4.0\text{mm}$)<br>• $> 500\text{g/ml} \implies \ge 4.0\text{mm}$ (blown: $6.0\text{mm}$) |
| **Rule 8(1)** | **Free Space Around Net Quantity** | OpenCV Bounding Box Geometry | Surrounding clearance $\ge$ numeral height (top/bottom) and $\ge 2\times$ height (left/right). |
| **Rule 9(1)(b)** | **Conspicuous Contrast** | OpenCV Color Space Analysis | Contrast ratio between text luminance and background luminance $\ge$ statutory threshold. |
| **Rule 9(4)** | Declaration Script Language | Unicode Classifier | Must be Devanagari script (Hindi) or Latin script (English). |
| **Second Schedule** | Standard Pack Size Mandate | Hash / Table Lookup | Checks against specified sizes (Biscuits, Tea, Atta, etc.); flags violation if non-standard size lacks required disclaimer. |
| **First Schedule** | Maximum Permissible Error (MPE) | Math Engine | Evaluates physical sample weight entered by officer against statutory MPE tolerance table. |

---

## 4. PostgreSQL 16 Relational Schema with JSONB

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES & USERS
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL, -- 'OFFICER', 'REVIEWER', 'ADMIN', 'SUPERADMIN'
    permissions JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES roles(id),
    employee_id   VARCHAR(100) UNIQUE,
    name          VARCHAR(200) NOT NULL,
    email         VARCHAR(200) UNIQUE NOT NULL,
    phone         VARCHAR(20),
    password_hash TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MASTER DATA
CREATE TABLE business_entities (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(300) NOT NULL,
    type       VARCHAR(50) NOT NULL, -- 'MANUFACTURER', 'PACKER', 'IMPORTER', 'BRAND_OWNER'
    address    TEXT NOT NULL,
    state      VARCHAR(100),
    pincode    VARCHAR(10),
    gstin      VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brands (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID NOT NULL REFERENCES business_entities(id),
    name               VARCHAR(200) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commodities (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id           UUID REFERENCES brands(id),
    business_entity_id UUID REFERENCES business_entities(id),
    generic_name       VARCHAR(300) NOT NULL,
    category           VARCHAR(100) NOT NULL,
    barcode            VARCHAR(100),
    sku                VARCHAR(100),
    package_type       VARCHAR(50) NOT NULL DEFAULT 'BOTTLE_BOX_POUCH',
    standard_pack_size NUMERIC(10,2),
    standard_pack_unit VARCHAR(20),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE field_definitions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_key VARCHAR(100) UNIQUE NOT NULL,
    display_name  VARCHAR(200) NOT NULL,
    data_type     VARCHAR(50) NOT NULL, -- 'STRING', 'NUMERIC', 'DATE', 'ADDRESS', 'CONTACT'
    allowed_units JSONB,                -- ['g', 'kg', 'ml', 'l', 'N', 'U']
    is_mandatory  BOOLEAN NOT NULL DEFAULT TRUE,
    description   TEXT
);

-- 3. RULES
CREATE TABLE rule_sets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version      VARCHAR(30) UNIQUE NOT NULL, -- 'LM-PCR-2011-v1.0'
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT FALSE,
    effective_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requirements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id   UUID NOT NULL REFERENCES rule_sets(id),
    rule_ref      VARCHAR(50) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT NOT NULL,
    severity      VARCHAR(20) NOT NULL, -- 'CRITICAL', 'MAJOR', 'MINOR'
    applicable_to JSONB NOT NULL DEFAULT '{}',
    check_logic   JSONB NOT NULL
);

-- 4. WORKFLOW: ASSIGNMENTS & INSPECTIONS
CREATE TABLE assignments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    assigned_by  UUID NOT NULL REFERENCES users(id),
    assigned_to  UUID NOT NULL REFERENCES users(id),
    rule_set_id  UUID NOT NULL REFERENCES rule_sets(id),
    status       VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    due_date     DATE,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inspections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id     UUID REFERENCES assignments(id),
    commodity_id      UUID NOT NULL REFERENCES commodities(id),
    officer_id        UUID NOT NULL REFERENCES users(id),
    rule_set_id       UUID NOT NULL REFERENCES rule_sets(id),
    status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    compliance_result VARCHAR(20),  -- 'PASS', 'FAIL', 'REVIEW'
    final_decision    VARCHAR(40),  -- 'APPROVED_COMPLIANT', 'APPROVED_NON_COMPLIANT', 'RETURNED_FOR_REVIEW'
    location          JSONB,
    context_notes     TEXT,
    physical_quantity NUMERIC(10,3),
    physical_unit     VARCHAR(20),
    submitted_at      TIMESTAMPTZ,
    finalized_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. EVIDENCE & ANALYSIS RUNS
CREATE TABLE evidence (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id  UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    file_key       TEXT NOT NULL,
    file_url       TEXT,
    view_type      VARCHAR(50) NOT NULL, -- 'FRONT_PDP', 'BACK_PANEL', 'SIDE_PANEL'
    mime_type      VARCHAR(100) NOT NULL,
    pdp_area_cm2   NUMERIC(8,2),
    image_metadata JSONB,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analysis_runs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id    UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    pipeline_version VARCHAR(50) NOT NULL,
    model_version    VARCHAR(50) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    error_detail     TEXT,
    raw_ocr_output   JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DECLARATIONS
CREATE TABLE declarations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id       UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    analysis_run_id     UUID REFERENCES analysis_runs(id),
    evidence_id         UUID REFERENCES evidence(id),
    field_definition_id UUID NOT NULL REFERENCES field_definitions(id),
    machine_value       TEXT,
    officer_value       TEXT,
    final_value         TEXT GENERATED ALWAYS AS (COALESCE(officer_value, machine_value)) STORED,
    confidence          NUMERIC(5,4) CHECK (confidence BETWEEN 0 AND 1),
    confidence_label    VARCHAR(20),
    bounding_box        JSONB,
    font_size_mm        NUMERIC(5,2),
    contrast_pass       BOOLEAN,
    script_language     VARCHAR(50),
    clearance_pass      BOOLEAN,
    is_corrected        BOOLEAN NOT NULL DEFAULT FALSE,
    correction_reason   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. EVALUATIONS & FINDINGS
CREATE TABLE compliance_evaluations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id  UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id),
    result         VARCHAR(20) NOT NULL, -- 'PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE'
    evaluated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    eval_detail    JSONB
);

CREATE TABLE findings (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id            UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    compliance_evaluation_id UUID NOT NULL REFERENCES compliance_evaluations(id),
    evidence_id              UUID REFERENCES evidence(id),
    severity                 VARCHAR(20) NOT NULL,
    title                    VARCHAR(300) NOT NULL,
    explanation              TEXT NOT NULL,
    legal_reference          VARCHAR(100) NOT NULL,
    officer_accepted         BOOLEAN,
    officer_note             TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. REPORTS & AUDIT TRAIL
CREATE TABLE reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID UNIQUE NOT NULL REFERENCES inspections(id),
    file_key      TEXT NOT NULL,
    file_url      TEXT,
    report_format VARCHAR(20) NOT NULL DEFAULT 'PDF',
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by  UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id   UUID NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity_time ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_declarations_insp ON declarations(inspection_id);
CREATE INDEX idx_findings_insp     ON findings(inspection_id);
```

---

## 5. Report Generation Engine (Statutory Forms A & B)

Reports are **100% deterministic PDFs** compiled from Jinja2 templates via WeasyPrint:
- Incorporates Official Government Emblem and Department of Consumer Affairs header.
- Formatted strictly according to **Form A (Weight Checking Data Sheet)** or **Form B (Volume/Length Checking Data Sheet)** from the Seventh Schedule of the Gazette.
- Displays side-by-side evidence photos with annotated bounding boxes.
- Itemizes every requirement check, compliance finding, officer remarks, and timestamped digital signatures.
- Stored securely in MinIO/S3 object storage; completely auditable and tamper-proof.
