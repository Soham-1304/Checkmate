# Production Dockerfile for Legal Metrology AI/ML Microservice
# Optimized for Hugging Face Spaces (Port 7860) and Render (Dynamic $PORT)
FROM python:3.11-slim

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    PIP_NO_CACHE_DIR=1 \
    PADDLE_DISABLE_TELEMETRY=1

# Install system dependencies required by OpenCV and ONNX/Paddle runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer cache: install python packages
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy source tree and configuration
COPY . .

# Ensure runtime directories exist
RUN mkdir -p /app/uploaded_images

# Warm OCR model cache at build time to prevent cold-start latency
RUN python -c "import numpy as np; from engine.ocr_pipeline import PackagingOCRPipeline; p = PackagingOCRPipeline(); p._run_ocr_raw(np.zeros((64, 64, 3), dtype=np.uint8)); print(f'Successfully warmed OCR model: {p.engine_name}')"

# Expose default Hugging Face Spaces port
EXPOSE 7860

# Start server: supports dynamic $PORT (Render) with 7860 fallback (Hugging Face Spaces)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
