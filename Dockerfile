# DoCA backend + in-process OCR — single Render web service.
# System libs below are for WeasyPrint (PDF) + OpenCV runtime.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
    libffi-dev libglib2.0-0 libgl1 libgobject-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ ./

# Warm the RapidOCR model cache at build time so first request is fast,
# then smoke-import the app so a broken dependency fails the BUILD, not boot.
RUN python -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()" || true
RUN SECRET_KEY="build_check_secret_key_2026" DATABASE_URL="postgresql+asyncpg://dummy:dummy@localhost/dummy" python -c "import app.main; print('app imports clean')"
RUN SECRET_KEY="build_check_secret_key_2026" DATABASE_URL="postgresql+asyncpg://dummy:dummy@localhost/dummy" python -c "import importlib.metadata as m; assert m.version('bcrypt').startswith('4.'); from app.core import security as s; h=s.get_password_hash('Officer@12345'); assert s.verify_password('Officer@12345', h); print('auth roundtrip ok')"

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
