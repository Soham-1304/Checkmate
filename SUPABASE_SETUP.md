# Supabase Setup — paste these into `DoCA/.env`

No secrets live in git. Copy `DoCA/.env.example` → `DoCA/.env`, fill:

## 1. Database (Supabase Postgres — pooler, asyncpg)

Supabase Dashboard → Project Settings → Database → Connection string → **Pooler** mode, then adapt:

```env
DATABASE_URL="postgresql+asyncpg://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?ssl=require"
```

Notes: port must be `6543` (pooler, not `5432`); keep `?ssl=require`; scheme stays `postgresql+asyncpg://`.

## 2. Storage (images + PDFs via Supabase Storage)

Dashboard → Storage → New bucket (both **Private**):

- `doca-evidence` (officer photos: FRONT_PDP / BACK_PANEL / SIDE_PANEL)
- `doca-reports` (Form A/B PDFs)

Dashboard → Project Settings → API → copy:

```env
STORAGE_BACKEND="supabase"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_KEY="<service_role key — server-side only, never ship in RN app>"
SUPABASE_BUCKET_EVIDENCE="doca-evidence"
SUPABASE_BUCKET_REPORTS="doca-reports"
```

RN app never gets the service key — it loads images through presigned URLs our API mints (`storage_service.presigned_url`, 1h expiry).

## 3. Verify (after `.env` is filled)

```bash
cd DoCA/backend
pip install -r requirements.txt
python -m app.db.seeds.seed_gazette
uvicorn app.main:app --reload --port 8000
curl localhost:8000/health
```

Stay on `STORAGE_BACKEND="local"` until buckets exist — code falls back to `backend/uploads/` automatically.
