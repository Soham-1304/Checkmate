from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.auth import router as auth_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.declarations import router as declarations_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.inspections import router as inspections_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(analysis_router)
api_router.include_router(inspections_router)
api_router.include_router(evidence_router)
api_router.include_router(declarations_router)
api_router.include_router(compliance_router)
api_router.include_router(dashboard_router)
