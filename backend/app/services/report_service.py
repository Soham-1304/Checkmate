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


def _render_pdf_reportlab(context: dict) -> bytes:
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#1E3A8A'), alignment=1
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'], fontSize=9, leading=13, textColor=colors.HexColor('#4B5563'), alignment=1
    )
    h2_style = ParagraphStyle(
        'H2', parent=styles['Heading2'], fontSize=11, leading=15, textColor=colors.HexColor('#1E3A8A'), spaceBefore=8, spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'], fontSize=8.5, leading=11, textColor=colors.HexColor('#1F2937')
    )
    small_style = ParagraphStyle(
        'Small', parent=styles['Normal'], fontSize=7.5, leading=10, textColor=colors.HexColor('#6B7280')
    )

    story = []

    # Header
    story.append(Paragraph('<b>GOVERNMENT OF INDIA</b>', title_style))
    story.append(Paragraph('MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', subtitle_style))
    story.append(Paragraph('DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION', subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#1E3A8A')))
    story.append(Spacer(1, 8))

    story.append(Paragraph('<b>CHECKMATE — STATUTORY INSPECTION CERTIFICATE & COMPLIANCE REPORT</b>', ParagraphStyle(
        'CertHeader', parent=styles['Heading2'], fontSize=13, leading=17, alignment=1, textColor=colors.HexColor('#0F172A')
    )))
    story.append(Spacer(1, 6))

    insp = context.get('inspection', {})
    comm = context.get('commodity', {})
    brand = context.get('brand', '—')
    officer = context.get('officer', {})
    entity = context.get('entity', {})

    res = str(insp.get('compliance_result') or '—').upper()
    res_color = '#059669' if res == 'PASS' else ('#DC2626' if res == 'FAIL' else '#D97706')

    summary_data = [
        [Paragraph('<b>Inspection ID:</b>', body_style), Paragraph(str(insp.get('id', '—')), body_style),
         Paragraph('<b>Compliance Result:</b>', body_style), Paragraph(f'<font color="{res_color}"><b>{res}</b></font>', body_style)],
        [Paragraph('<b>Commodity:</b>', body_style), Paragraph(f'{brand} - {comm.get("generic_name", "—")}', body_style),
         Paragraph('<b>Category:</b>', body_style), Paragraph(str(comm.get('category', '—')), body_style)],
        [Paragraph('<b>Manufacturer / Entity:</b>', body_style), Paragraph(str(entity.get('legal_name', '—')), body_style),
         Paragraph('<b>Pack Size / Sample:</b>', body_style), Paragraph(str(comm.get('pack_size', '—')), body_style)],
        [Paragraph('<b>Inspecting Officer:</b>', body_style), Paragraph(f'{officer.get("name", "—")} ({officer.get("employee_id", "—")})', body_style),
         Paragraph('<b>Date Generated:</b>', body_style), Paragraph(str(context.get('generated_at', '—')), body_style)],
    ]
    t = Table(summary_data, colWidths=[115, 145, 110, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Declarations Table
    story.append(Paragraph('<b>MANDATORY DECLARATIONS AUDIT (Legal Metrology Rules 2011)</b>', h2_style))
    decl_rows = [
        [Paragraph('<b>Rule / Field</b>', body_style),
         Paragraph('<b>Detected Value</b>', body_style),
         Paragraph('<b>Confidence</b>', body_style),
         Paragraph('<b>Font (mm)</b>', body_style),
         Paragraph('<b>Status</b>', body_style)]
    ]
    for d in context.get('declarations', []):
        decl_rows.append([
            Paragraph(str(d.get('label') or d.get('field_code') or '—'), body_style),
            Paragraph(str(d.get('raw_value', '—')), body_style),
            Paragraph(f"{int(float(d.get('confidence') or 0)*100)}%", body_style),
            Paragraph(str(d.get('font_size_mm') or '—'), body_style),
            Paragraph(str(d.get('status', '—')), body_style)
        ])
    if len(decl_rows) == 1:
        decl_rows.append([Paragraph('No declarations captured', small_style), Paragraph('—', small_style), Paragraph('—', small_style), Paragraph('—', small_style), Paragraph('—', small_style)])

    dt = Table(decl_rows, colWidths=[130, 170, 60, 60, 100])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EEF2F6')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(dt)
    story.append(Spacer(1, 10))

    # Findings Table (if any)
    findings = context.get('findings', [])
    if findings:
        story.append(Paragraph('<b>STATUTORY NON-COMPLIANCE FINDINGS & VIOLATIONS</b>', h2_style))
        find_rows = [
            [Paragraph('<b>Rule Violated</b>', body_style),
             Paragraph('<b>Finding Details</b>', body_style),
             Paragraph('<b>Legal Reference</b>', body_style)]
        ]
        for f in findings:
            find_rows.append([
                Paragraph(str(f.get('rule_id') or 'Rule Violation'), body_style),
                Paragraph(str(f.get('explanation') or '—'), body_style),
                Paragraph(str(f.get('legal_reference') or 'Legal Metrology Act / Rules 2011'), body_style)
            ])
        ft = Table(find_rows, colWidths=[110, 240, 170])
        ft.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FEE2E2')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#FCA5A5')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FEE2E2')),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(ft)
        story.append(Spacer(1, 10))

    # Legal Disclaimer and Verification Note
    story.append(Paragraph(
        '<i>Statutory Notice: This report is generated pursuant to the Legal Metrology (Packaged Commodities) Rules, 2011. '
        'Any discrepancy found herein constitutes a statutory violation subject to legal proceedings under the Legal Metrology Act, 2009. '
        'Verified electronically by Checkmate — Department of Consumer Affairs Legal Metrology Engine.</i>',
        small_style
    ))

    doc.build(story)
    return buf.getvalue()


def render_pdf(context: dict) -> bytes:
    try:
        from weasyprint import HTML
        env = Environment(
            loader=FileSystemLoader(TEMPLATE_DIR), autoescape=select_autoescape(["html"])
        )
        html = env.get_template(TEMPLATE_NAME).render(**context)
        return HTML(string=html).write_pdf()
    except Exception as exc:
        logger.warning(
            "WeasyPrint unavailable (%s), rendering statutory report via ReportLab engine",
            exc,
        )
        return _render_pdf_reportlab(context)


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
