# DoCA Backend Service (FastAPI + PostgreSQL 16)
## Legal Metrology (Packaged Commodities) Rules, 2011 Compliance API

### Architecture Principles
- **100% Deterministic Rule Engine**: Statutory evaluations mapped directly to Gazette notification GSR 202(E).
- **Relational Integrity with JSONB**: PostgreSQL 16 handles ACID transactions, relational links, and polymorphic OCR/geometry data.
- **Human-in-the-Loop**: Preserves `machine_value` alongside `officer_value` on corrections with automated audit logs.

### Directory Layout
```
backend/
├── app/
│   ├── main.py               # FastAPI entrypoint with CORS & routes
│   ├── deps.py               # JWT bearer auth & DB dependency
│   ├── core/
│   │   ├── config.py         # Pydantic settings (.env)
│   │   ├── security.py       # Password hashing & JWT tokens
│   │   └── exceptions.py     # Custom HTTP exceptions
│   ├── db/
│   │   ├── session.py        # Async SQLAlchemy engine & sessionmaker
│   │   └── seeds/
│   │       └── seed_gazette.py # Seeds roles, users, fields & Gazette rules
│   ├── models/               # 16 SQLAlchemy ORM models
│   ├── schemas/              # Pydantic DTOs
│   ├── services/
│   │   └── compliance_service.py # Deterministic statutory rule evaluator
│   └── api/v1/               # REST Route Controllers
│       ├── auth.py           # Login & profile
│       ├── inspections.py    # Inspection lifecycle & review
│       ├── evidence.py       # Multi-image upload
│       ├── declarations.py   # Machine values & officer corrections
│       ├── compliance.py     # Rule engine trigger & findings
│       └── dashboard.py      # Summary metrics
├── uploads/                  # Evidence image storage
└── requirements.txt
```

### Running Locally

1. **Start Infrastructure (Docker Compose)**:
   ```bash
   cd ../ && docker compose up -d
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed Database with Gazette Rules & Admin Accounts**:
   ```bash
   python -m app.db.seeds.seed_gazette
   ```
   *Default Accounts seeded:*
   - Admin: `admin@doca.gov.in` / `Admin@12345`
   - Reviewer: `reviewer@doca.gov.in` / `Reviewer@12345`
   - Officer: `officer@doca.gov.in` / `Officer@12345`

4. **Start Backend Dev Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Interactive Swagger Docs**:
   Visit [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
