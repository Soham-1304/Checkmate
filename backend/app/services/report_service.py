"""Inspection PDF report — gather context, render (Jinja2 + WeasyPrint), store, audit."""
import asyncio
import base64
import logging
import os
from datetime import datetime, timezone
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.compliance import AuditEvent, ComplianceEvaluation, Finding, Report
from app.models.evidence import Declaration, Evidence
from app.models.master_data import Brand, BusinessEntity, Commodity, FieldDefinition
from app.models.rules import Requirement, RuleSet
from app.models.user import User
from app.models.workflow import Inspection
from app.services import storage_service

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "report_templates")
TEMPLATE_NAME = "inspection_report.html.j2"
TEMPLATE_VERSION = "v1"
LOW_CONF_THRESHOLD = 0.60


def _fmt(dt):
    return dt.strftime("%d-%m-%Y %H:%M IST") if dt else "—"


async def build_report_context(db: AsyncSession, inspection_id: UUID) -> dict:
    inspection = (
        await db.execute(select(Inspection).where(Inspection.id == inspection_id))
    ).scalar_one_or_none()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found")

    officer = (
        await db.execute(select(User).where(User.id == inspection.officer_id))
    ).scalar_one_or_none()
    commodity = (
        await db.execute(select(Commodity).where(Commodity.id == inspection.commodity_id))
    ).scalar_one_or_none()
    brand = (
        await db.execute(select(Brand).where(Brand.id == commodity.brand_id))
    ).scalar_one_or_none() if commodity and commodity.brand_id else None
    entity = (
        await db.execute(select(BusinessEntity).where(BusinessEntity.id == commodity.business_entity_id))
    ).scalar_one_or_none() if commodity and commodity.business_entity_id else None
    rule_set = (
        await db.execute(select(RuleSet).where(RuleSet.id == inspection.rule_set_id))
    ).scalar_one_or_none() if inspection.rule_set_id else None

    ev_rows = (
        await db.execute(
            select(Evidence).where(Evidence.inspection_id == inspection_id).order_by(Evidence.uploaded_at)
        )
    ).scalars().all()
    evidence = []
    for ev in ev_rows:
        img_b64 = None
        try:
            raw = await asyncio.to_thread(
                storage_service.download_bytes, ev.file_key, settings.SUPABASE_BUCKET_EVIDENCE
            )
            img_b64 = base64.b64encode(raw).decode("ascii")
        except Exception as exc:
            logger.warning("report: evidence image unavailable %s: %s", ev.file_key, exc)
        evidence.append({
            "view_type": ev.view_type,
            "mime_type": ev.mime_type,
            "uploaded_at": _fmt(ev.uploaded_at),
            "image_b64": img_b64,
        })

    decl_rows = (
        await db.execute(
            select(Declaration, FieldDefinition)
            .join(FieldDefinition, Declaration.field_definition_id == FieldDefinition.id)
            .where(Declaration.inspection_id == inspection_id)
            .order_by(FieldDefinition.display_name)
        )
    ).all()
    declarations = [{
        "field": fd.display_name,
        "canonical_key": fd.canonical_key,
        "machine_value": d.machine_value or "—",
        "officer_value": d.officer_value or "—",
        "corrected": bool(d.officer_value and d.officer_value != (d.machine_value or "")),
        "confidence": float(d.confidence) if d.confidence is not None else None,
        "low_conf": d.confidence is not None and float(d.confidence) < LOW_CONF_THRESHOLD,
    } for d, fd in decl_rows]

    eval_rows = (
        await db.execute(
            select(ComplianceEvaluation, Requirement)
            .join(Requirement, ComplianceEvaluation.requirement_id == Requirement.id)
            .where(ComplianceEvaluation.inspection_id == inspection_id)
            .order_by(Requirement.rule_ref)
        )
    ).all()
    evaluations = [{
        "rule_ref": req.rule_ref,
        "title": req.title,
        "severity": req.severity,
        "result": ev.result,
    } for ev, req in eval_rows]

    finding_rows = (
        await db.execute(
            select(Finding).where(Finding.inspection_id == inspection_id).order_by(Finding.created_at)
        )
    ).scalars().all()
    findings = [{
        "severity": f.severity,
        "title": f.title,
        "explanation": f.explanation,
        "legal_reference": f.legal_reference,
        "officer_accepted": f.officer_accepted,
        "officer_note": f.officer_note or "—",
    } for f in finding_rows]

    audit_rows = (
        await db.execute(
            select(AuditEvent)
            .where(AuditEvent.entity_type == "INSPECTION", AuditEvent.entity_id == inspection_id)
            .order_by(AuditEvent.created_at)
            .limit(50)
        )
    ).scalars().all()
    audit_trail = [{
        "action": a.action,
        "actor_id": str(a.actor_id),
        "at": _fmt(a.created_at),
    } for a in audit_rows]

    loc = inspection.location or {}
    return {
        "template_version": TEMPLATE_VERSION,
        "generated_at": _fmt(datetime.now(timezone.utc)),
        "inspection": {
            "id": str(inspection.id),
            "status": inspection.status,
            "compliance_result": inspection.compliance_result or "—",
            "final_decision": inspection.final_decision or "—",
            "location": ", ".join(x for x in [
                loc.get("market_name"), loc.get("district"), loc.get("state")] if x) or "—",
            "context_notes": inspection.context_notes or "—",
            "physical_sample": (
                f"{inspection.physical_quantity} {inspection.physical_unit or ''}".strip()
                if inspection.physical_quantity else "—"),
            "created_at": _fmt(inspection.created_at),
            "submitted_at": _fmt(inspection.submitted_at),
        },
        "officer": {
            "name": officer.name if officer else "—",
            "employee_id": (officer.employee_id or "—") if officer else "—",
            "email": officer.email if officer else "—",
        },
        "commodity": {
            "generic_name": commodity.generic_name if commodity else "—",
            "category": commodity.category if commodity else "—",
            "barcode": (commodity.barcode or "—") if commodity else "—",
            "sku": (commodity.sku or "—") if commodity else "—",
            "package_type": commodity.package_type if commodity else "—",
            "pack_size": (
                f"{commodity.standard_pack_size} {commodity.standard_pack_unit or ''}".strip()
                if commodity and commodity.standard_pack_size else "—"),
        },
        "brand": brand.name if brand else "—",
        "entity": {
            "legal_name": entity.legal_name if entity else "—",
            "type": entity.type if entity else "—",
            "address": entity.address if entity else "—",
        },
        "rule_set_version": getattr(rule_set, "version", "—") if rule_set else "—",
        "evidence": evidence,
        "declarations": declarations,
        "evaluations": evaluations,
        "findings": findings,
        "audit_trail": audit_trail,
    }


def render_pdf(context: dict) -> bytes:
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as exc:
        raise RuntimeError(f"WeasyPrint unavailable (system libs?): {exc}") from exc
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR), autoescape=select_autoescape(["html"])
    )
    html = env.get_template(TEMPLATE_NAME).render(**context)
    return HTML(string=html).write_pdf()


async def render_inspection_report(
    db: AsyncSession, inspection_id: UUID, actor_id: UUID
) -> Report:
    context = await build_report_context(db, inspection_id)
    pdf = await asyncio.to_thread(render_pdf, context)

    file_key = f"reports/{inspection_id}.pdf"
    await asyncio.to_thread(
        storage_service.upload_bytes,
        file_key, pdf, "application/pdf", settings.SUPABASE_BUCKET_REPORTS,
    )
    file_url = await asyncio.to_thread(
        storage_service.presigned_url, file_key, settings.SUPABASE_BUCKET_REPORTS
    )

    report = (
        await db.execute(select(Report).where(Report.inspection_id == inspection_id))
    ).scalar_one_or_none()
    if report:
        report.file_key = file_key
        report.file_url = file_url
        report.generated_at = datetime.now(timezone.utc)
        report.generated_by = actor_id
    else:
        report = Report(
            inspection_id=inspection_id,
            file_key=file_key,
            file_url=file_url,
            report_format="PDF",
            generated_by=actor_id,
        )
        db.add(report)

    db.add(AuditEvent(
        actor_id=actor_id,
        action="REPORT_GENERATED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        new_value={"template_version": TEMPLATE_VERSION, "file_key": file_key},
    ))
    await db.commit()
    await db.refresh(report)
    return report
