import os
import uuid

from app.core.config import settings

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

VALID_MIMES = {"image/jpeg", "image/png", "image/webp"}


def _supabase_client():
    from supabase import create_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase storage selected but SUPABASE_URL / SUPABASE_SERVICE_KEY missing.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def check_upload(content_type: str, size_bytes: int) -> None:
    from fastapi import HTTPException, status

    if content_type not in VALID_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Must be JPG, PNG, or WEBP.",
        )
    if size_bytes > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.",
        )


def build_object_name(inspection_id: str, filename: str) -> str:
    ext = os.path.splitext(filename or "")[1] or ".jpg"
    return f"{inspection_id}/{uuid.uuid4().hex[:8]}{ext}"


def save_bytes_local(object_name: str, data: bytes) -> str:
    flat = object_name.replace("/", "_")
    target = os.path.join(UPLOAD_DIR, flat)
    with open(target, "wb") as f:
        f.write(data)
    return f"/uploads/{flat}"


def upload_bytes(object_name: str, data: bytes, content_type: str, bucket: str) -> str:
    if settings.STORAGE_BACKEND == "supabase":
        client = _supabase_client()
        client.storage.from_(bucket).upload(
            object_name, data, {"content-type": content_type, "upsert": "true"}
        )
        return object_name
    return save_bytes_local(object_name, data)


def presigned_url(object_name: str, bucket: str) -> str:
    if settings.STORAGE_BACKEND == "supabase":
        client = _supabase_client()
        res = client.storage.from_(bucket).create_signed_url(
            object_name, settings.SUPABASE_URL_EXPIRE_SECS
        )
        return res.get("signedURL") or res.get("signedUrl") or ""
    return f"/uploads/{object_name.replace('/', '_')}"


def download_bytes(object_name: str, bucket: str) -> bytes:
    if settings.STORAGE_BACKEND == "supabase":
        client = _supabase_client()
        return client.storage.from_(bucket).download(object_name)
    flat = object_name.replace("/", "_")
    with open(os.path.join(UPLOAD_DIR, flat), "rb") as f:
        return f.read()
