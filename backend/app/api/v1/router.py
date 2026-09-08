from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.masters import router as masters_router
from app.api.v1.rule_sets import router as rule_sets_router
from app.api.v1.users import router as users_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.declarations import router as declarations_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.inspections import router as inspections_router
from app.api.v1.reports import router as reports_router
from app.api.v1.repository import router as repository_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(assignments_router)
api_router.include_router(masters_router)
api_router.include_router(rule_sets_router)
api_router.include_router(analysis_router)
api_router.include_router(inspections_router)
api_router.include_router(evidence_router)
api_router.include_router(declarations_router)
api_router.include_router(compliance_router)
api_router.include_router(reports_router)
api_router.include_router(repository_router)
api_router.include_router(audit_router)
api_router.include_router(dashboard_router)
