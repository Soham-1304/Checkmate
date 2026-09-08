"""Demo World seeder — authentic-looking fake catalog + believable 60-day compliance history.

Idempotent: uses deterministic UUIDs; re-running skips existing rows and leaves verdicts intact.
Honest: for each seeded inspection we fabricate ONLY the evidence bytes + label declarations;
the compliance verdict, findings and PDF report are produced by the REAL engine
(run_compliance_evaluation + render_inspection_report), so the demo genuinely exercises
the rules pipeline end to end.
"""
import asyncio
import os
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.compliance import AuditEvent, Report
from app.models.evidence import AnalysisRun, Declaration, Evidence
from app.models.master_data import Brand, BusinessEntity, Commodity, FieldDefinition
from app.models.rules import RuleSet
from app.models.user import Role, User
from app.models.workflow import Assignment, Inspection
from app.services import storage_service, report_service
from app.services.compliance_service import run_compliance_evaluation

PHOTO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "test_assets")
PHOTOS = {  # basename -> bytes + mime
    "oats": ("oats.png", "image/png"),
    "lays": ("lays.png", "image/png"),
    "amul": ("amul_chocolate.png", "image/png"),
}

# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------
ENTITIES = [
    {"legal_name": "Parle Products Pvt Ltd", "type": "MANUFACTURER", "address": "Village Pilakhwa, NH-24, Ghaziabad", "state": "Uttar Pradesh", "pincode": "245304", "gstin": "27AAACP2466J1Z5"},
    {"legal_name": "Britannia Industries Ltd", "type": "MANUFACTURER", "address": "5/1A, Hungerford Street, Kolkata", "state": "West Bengal", "pincode": "700017", "gstin": "19AAACB3491P1Z0"},
    {"legal_name": "Gujarat Co-op Milk Mktg Fed Ltd (GCMMF)", "type": "MANUFACTURER", "address": "Amul Dairy Road, Anand", "state": "Gujarat", "pincode": "388001", "gstin": "24AAACG5610C1Z3"},
    {"legal_name": "Haldiram Snacks Pvt Ltd", "type": "MANUFACTURER", "address": "Plot 4, Sector 63, Noida", "state": "Uttar Pradesh", "pincode": "201301", "gstin": "09AAACH7445B1Z3"},
    {"legal_name": "Tata Consumer Products Ltd", "type": "MANUFACTURER", "address": "Munnar PO, Idukki", "state": "Kerala", "pincode": "685612", "gstin": "32AAACT2673B1Z8"},
    {"legal_name": "Nestle India Ltd", "type": "MANUFACTURER", "address": "Village Gupta, Kala Amb, Sirmour", "state": "Himachal Pradesh", "pincode": "173030", "gstin": "02AAACN7418N1Z6"},
    {"legal_name": "ITC Ltd - Foods Division", "type": "MANUFACTURER", "address": "ITC Green Centre, Gurugram", "state": "Haryana", "pincode": "122003", "gstin": "06AACCI0673H1ZK"},
    {"legal_name": "Marico Ltd", "type": "MANUFACTURER", "address": "175 CST Road, Kalina, Mumbai", "state": "Maharashtra", "pincode": "400098", "gstin": "27AABCM0586J1Z2"},
]
BRANDS_SPEC = [
    ("Parle-G", "Parle Products Pvt Ltd"),
    ("Britannia", "Britannia Industries Ltd"),
    ("Amul", "Gujarat Co-op Milk Mktg Fed Ltd (GCMMF)"),
    ("Haldiram's", "Haldiram Snacks Pvt Ltd"),
    ("Tata", "Tata Consumer Products Ltd"),
    ("Maggi", "Nestle India Ltd"),
    ("Aashirvaad", "ITC Ltd - Foods Division"),
    ("Saffola", "Marico Ltd"),
]
COMMODITIES_SPEC = [
    # (generic_name, category, brand, barcode, sku, size, unit)
    ("Glucose Biscuits", "BISCUITS", "Parle-G", "8901002100001", "PG-GB-100G", 100, "g"),
    ("Marie Gold Biscuits", "BISCUITS", "Britannia", "8901002100002", "BRN-MG-200G", 200, "g"),
    ("Milk Chocolate", "CHOCOLATE", "Amul", "8901002100003", "AMUL-CHOC-100G", 100, "g"),
    ("Pasteurised Butter", "DAIRY", "Amul", "8901002100004", "AMUL-BUT-500G", 500, "g"),
    ("Aloo Bhujia Snack", "SNACKS", "Haldiram's", "8901002100005", "HLD-BHU-200G", 200, "g"),
    ("CTC Tea", "TEA", "Tata", "8901002100006", "TATA-TEA-250G", 250, "g"),
    ("Iodised Salt", "SALT", "Tata", "8901002100007", "TATA-SALT-1KG", 1, "kg"),
    ("Instant Noodles", "NOODLES", "Maggi", "8901002100008", "MAG-NOOD-70G", 70, "g"),
    ("Sharbati Whole Wheat Atta", "ATTA", "Aashirvaad", "8901002100009", "ASH-ATTA-5KG", 5, "kg"),
    ("Refined Sunflower Oil", "EDIBLE_OIL", "Saffola", "8901002100010", "SAF-OIL-1L", 1, "l"),
    ("Roasted Peanuts", "SNACKS", "Haldiram's", "8901002100011", "HLD-PNT-150G", 150, "g"),
    ("Milk Powder", "DAIRY", "Amul", "8901002100012", "AMUL-MP-500G", 500, "g"),
]

OFFICERS = [
    {"email": "priya.sharma@doca.gov.in", "name": "Priya Sharma", "employee_id": "DOCA-OFF-203", "password": "Officer@12345", "location": "New Delhi, Delhi"},
    {"email": "rahul.verma@doca.gov.in", "name": "Rahul Verma", "employee_id": "DOCA-OFF-204", "password": "Officer@12345", "location": "Bengaluru, Karnataka"},
]

# ---------------------------------------------------------------------------
# Inspection profiles: (brand, commodity index, officer email, status, issue, location, days_ago)
# days_ago from today. status: COMPLETED / UNDER_REVIEW / IN_PROGRESS
# issue -> verdict shaping (see _decls)
# ---------------------------------------------------------------------------
INSPECTIONS = [
    ("Amul", 2, "officer@doca.gov.in", "COMPLETED", "pass", ("Anand", "Gujarat"), 42),
    ("Parle-G", 0, "officer@doca.gov.in", "COMPLETED", "fail_e", ("Ghaziabad", "Uttar Pradesh"), 38),
    ("Britannia", 1, "officer@doca.gov.in", "COMPLETED", "pass", ("Kolkata", "West Bengal"), 35),
    ("Maggi", 7, "officer@doca.gov.in", "COMPLETED", "fail_7", ("Kala Amb", "Himachal Pradesh"), 30),
    ("Tata", 5, "officer@doca.gov.in", "COMPLETED", "fail_mpe", ("Munnar", "Kerala"), 27),
    ("Aashirvaad", 8, "officer@doca.gov.in", "COMPLETED", "fail_schedule", ("Gurugram", "Haryana"), 24),
    ("Haldiram's", 4, "officer@doca.gov.in", "COMPLETED", "fail_a", ("Noida", "Uttar Pradesh"), 20),
    ("Saffola", 9, "officer@doca.gov.in", "COMPLETED", "pass", ("Mumbai", "Maharashtra"), 18),
    ("Amul", 3, "priya.sharma@doca.gov.in", "COMPLETED", "pass", ("Delhi", "Delhi"), 15),
    ("Tata", 6, "rahul.verma@doca.gov.in", "UNDER_REVIEW", "review_qty", ("Bengaluru", "Karnataka"), 12),
    ("Maggi", 7, "priya.sharma@doca.gov.in", "UNDER_REVIEW", "review_mrp", ("New Delhi", "Delhi"), 9),
    ("Britannia", 1, "rahul.verma@doca.gov.in", "UNDER_REVIEW", "review_font", ("Chennai", "Tamil Nadu"), 7),
    ("Amul", 11, "officer@doca.gov.in", "IN_PROGRESS", "pass", ("Anand", "Gujarat"), 4),
    ("Haldiram's", 10, "priya.sharma@doca.gov.in", "IN_PROGRESS", "review_qty", ("Mumbai", "Maharashtra"), 2),
    ("Parle-G", 0, "rahul.verma@doca.gov.in", "IN_PROGRESS", "pass", ("Pune", "Maharashtra"), 1),
]

# Map issue -> MPE physical quantity (declared - deficiency). Only used when physical wanted.
MPE_DEFICIT = {"fail_mpe": (4.0, "g")}

# ---------------------------------------------------------------------------
# Declaration fabricator — returns (decl dict, font_for_net_quantity)
# ---------------------------------------------------------------------------
def _decls(commodity, issue):
    """Good declarations for a commodity; then apply the failing/review issue."""
    ent = commodity.brand.business_entity
    size = commodity.standard_pack_size
    unit = commodity.standard_pack_unit
    qty_label = f"{str(size).rstrip('0').rstrip('.') if isinstance(size, float) else size} {unit}"
    addr = f"{ent.address}, {ent.state} - {ent.pincode}"
    d = {
        "mrp": ("MRP Rs. 30.00", "inclusive of all taxes", 0.98),
        "net_quantity": (f"Net Qty. {qty_label}", qty_label, 0.97),
        "net_quantity_unit": (unit, unit, 0.99),
        "mfg_date": ("Mfg: 04/2026", "04/2026", 0.96),
        "expiry_date": ("Best Before 10 Months", "10 months", 0.94),
        "generic_name": (commodity.generic_name, commodity.generic_name, 0.99),
        "manufacturer_name": ("Manufactured by: " + ent.legal_name, ent.legal_name, 0.98),
        "manufacturer_address": ("Manufactured at: " + addr, addr, 0.93),
        "packer_name": ("Packed by: " + ent.legal_name, ent.legal_name, 0.71),
        "importer_name": ("Imported by: " + ent.legal_name, ent.legal_name, 0.66),
        "consumer_care": ("Consumer Care: 1800-000-0000, care@example.com", "1800-000-0000, care@example.com", 0.88),
        "standard_pack_warning": ("", "", 0.7),
    }
    font = 2.5  # net_quantity font in mm: passes Table I (min 1.0 for <=200g, 2.0 for <=500g)
    if issue == "fail_e":
        d["mrp"] = ("MRP Rs. 30.00", "MRP Rs. 30.00", 0.97)  # no 'taxes' phrase -> FAIL
    elif issue == "fail_a":
        d["manufacturer_address"] = ("", "", 0.9)
    elif issue == "fail_7":
        font = 0.7  # below min 1.0mm -> FAIL
    elif issue == "fail_d":
        d["mfg_date"] = ("", "", 0.9)
    elif issue == "fail_schedule":
        d["net_quantity"] = ("Net Qty. 4.9 kg", "4.9 kg", 0.97)
        d["net_quantity_unit"] = ("kg", "kg", 0.99)  # 4900g not in SS atta sizes -> FAIL (no disclaimer)
    elif issue == "review_qty":
        d["net_quantity"] = (f"Net Qty. {qty_label}", qty_label, 0.45)  # low conf
        font = None  # uncertain extraction -> font size un-measurable -> Rule 7 REVIEW
    elif issue == "review_mrp":
        d["mrp"] = ("MRP Rs. 30.00", "inclusive of all taxes", 0.40)  # low conf
    elif issue == "review_font":
        font = None  # -> Rule 7 REVIEW
    return d, font


async def _seed_users_and_roles(session):
    roles = {}
    for rname in ("SUPERADMIN", "ADMIN", "REVIEWER", "OFFICER"):
        r = (await session.execute(select(Role).where(Role.name == rname))).scalar_one_or_none()
        if not r:
            r = Role(name=rname, permissions={"all": True if rname == "SUPERADMIN" else {}})
            session.add(r)
            await session.flush()
        roles[rname] = r
    users = {}
    for o in OFFICERS:
        u = (await session.execute(select(User).where(User.email == o["email"]))).scalar_one_or_none()
        if not u:
            u = User(email=o["email"], name=o["name"], employee_id=o["employee_id"],
                     role_id=roles["OFFICER"].id, password_hash=get_password_hash(o["password"]))
            session.add(u)
            await session.flush()
        users[o["email"]] = u
    for email in ("admin@doca.gov.in", "officer@doca.gov.in", "reviewer@doca.gov.in"):
        u = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if u:
            users[email] = u
    return users


async def seed_demo_world():
    import sys
    print("🌍 Seeding Demo World...")
    async with AsyncSessionLocal() as session:
        if "--reset" in sys.argv:
            print("  [reset] dropping prior demo-world inspections...")
            ids = [uuid.uuid5(uuid.NAMESPACE_URL, f"doca-demo-world/{b}-{c}-{s}") for (b, c, _o, _st, s, _loc, _d) in INSPECTIONS]
            for iid in ids:
                insp = (await session.execute(select(Inspection).where(Inspection.id == iid))).scalar_one_or_none()
                if insp:
                    await session.delete(insp)
            await session.commit()
        users = await _seed_users_and_roles(session)

        entities = {}
        for e in ENTITIES:
            obj = (await session.execute(select(BusinessEntity).where(BusinessEntity.legal_name == e["legal_name"]))).scalar_one_or_none()
            if not obj:
                obj = BusinessEntity(**e)
                session.add(obj)
                await session.flush()
            entities[e["legal_name"]] = obj

        brands = {}
        for name, ent in BRANDS_SPEC:
            obj = (await session.execute(select(Brand).where(Brand.name == name))).scalar_one_or_none()
            if not obj:
                obj = Brand(name=name, business_entity_id=entities[ent].id)
                session.add(obj)
                await session.flush()
            brands[name] = obj

        commod_byidx = {}
        for i, (gname, cat, brand, barcode, sku, size, unit) in enumerate(COMMODITIES_SPEC):
            obj = (await session.execute(select(Commodity).where(Commodity.barcode == barcode))).scalar_one_or_none()
            if not obj:
                obj = Commodity(generic_name=gname, category=cat, brand_id=brands[brand].id,
                                business_entity_id=brands[brand].business_entity_id, barcode=barcode,
                                sku=sku, package_type="BOTTLE_BOX_POUCH",
                                standard_pack_size=size, standard_pack_unit=unit)
                session.add(obj)
                await session.flush()
            commod_byidx[i] = obj

        rule_set = (await session.execute(select(RuleSet).where(RuleSet.is_active == True))).scalar_one_or_none()
        fields = {}
        for f in (await session.execute(select(FieldDefinition))).scalars().all():
            fields[f.canonical_key] = f
        admin_id = users["admin@doca.gov.in"].id

        # Assignments (a few)
        officer_ids = [users["officer@doca.gov.in"].id, users["priya.sharma@doca.gov.in"].id, users["rahul.verma@doca.gov.in"].id]
        action_order = ["analysis", "evaluation", "evidence", "policy", "inspection"]
        for a in range(6):
            c = commod_byidx[a % len(commod_byidx)]
            to = officer_ids[a % len(officer_ids)]
            exists = (await session.execute(select(Assignment).where(
                Assignment.commodity_id == c.id, Assignment.assigned_to == to, Assignment.status == "ASSIGNED"
            ))).scalar_one_or_none()
            if not exists:
                session.add(Assignment(commodity_id=c.id, assigned_by=admin_id, assigned_to=to,
                                       rule_set_id=rule_set.id, status="ASSIGNED",
                                       due_date=date.today() + timedelta(days=5),
                                       notes=f"Verify MRP, net qty and font height on {c.generic_name} packs."))
        await session.commit()

        # Field order tuple for deterministic AnalysisRun/declaration linkage
        FIELD_ORDER = ["mrp", "net_quantity", "net_quantity_unit", "mfg_date", "expiry_date",
                       "generic_name", "manufacturer_name", "manufacturer_address", "packer_name",
                       "importer_name", "consumer_care", "standard_pack_warning"]

        photo_cache = {}
        for key, (fname, mime) in PHOTOS.items():
            p = os.path.join(PHOTO_DIR, fname)
            if os.path.exists(p):
                with open(p, "rb") as fh:
                    photo_cache[key] = (fh.read(), mime)

        today = datetime.now(timezone.utc)
        for (brand, cidx, ofemail, status, issue, (loc_district, loc_state), days_ago) in INSPECTIONS:
            commodity = commod_byidx[cidx]
            officer = users.get(ofemail) or users["officer@doca.gov.in"]
            insp_id = uuid.uuid5(uuid.NAMESPACE_URL, f"doca-demo-world/{brand}-{cidx}-{issue}")

            insp = (await session.execute(select(Inspection).where(Inspection.id == insp_id))).scalar_one_or_none()
            created_at = today - timedelta(days=days_ago)
            loc = {"market_name": f"{loc_district} Market", "district": loc_district, "state": loc_state}

            new = False
            if not insp:
                insp = Inspection(id=insp_id, commodity_id=commodity.id, officer_id=officer.id,
                                  rule_set_id=rule_set.id, status=status, location=loc,
                                  context_notes=f"Field visit for {commodity.generic_name} ({commodity.brand.name}).",
                                  created_at=created_at, updated_at=created_at)
                session.add(insp)
                await session.flush()
                new = True

            # Evidence (reuse the 3 real photos as FRONT/BACK/CLOSEUP)
            ev_existing = (await session.execute(select(Evidence).where(Evidence.inspection_id == insp.id))).scalars().all()
            if not ev_existing:
                view_types = ["FRONT_PDP", "BACK_PANEL", "CLOSEUP"]
                photo_keys = list(photo_cache.keys()) if photo_cache else ["oats"]
                for j, vt in enumerate(view_types):
                    key = photo_keys[j % len(photo_keys)]
                    data, mime = photo_cache[key]
                    oname = f"demo/{insp_id}/{uuid.uuid4().hex[:8]}.png"
                    storage_service.upload_bytes(oname, data, mime, "Bluetick_Image_Store")
                    furi = None
                    try:
                        furi = storage_service.presigned_url(oname, "Bluetick_Image_Store")
                    except Exception:
                        pass
                    session.add(Evidence(inspection_id=insp.id, file_key=oname, file_url=furi,
                                          view_type=vt, mime_type=mime))
                await session.flush()

            # AnalysisRun + Declarations (only if none yet)
            decl_existing = (await session.execute(select(Declaration).where(Declaration.inspection_id == insp.id))).scalars().all()
            if not decl_existing:
                run = AnalysisRun(inspection_id=insp.id, pipeline_version="local-1.0",
                                  model_version="regex-tier1-1.0", status="COMPLETED",
                                  completed_at=created_at + timedelta(hours=1))
                session.add(run)
                await session.flush()

                decls, font = _decls(commodity, issue)
                # MPE: physical sample on the inspection for fail_mpe (250g declared vs 230g weighed)
                if issue == "fail_mpe":
                    insp.physical_quantity = 230.0
                    insp.physical_unit = "g"

                for k in FIELD_ORDER:
                    val, ov, conf = decls[k]
                    fd = fields[k]
                    db = Declaration(
                        inspection_id=insp.id, analysis_run_id=run.id, field_definition_id=fd.id,
                        machine_value=val, officer_value=ov, confidence=conf,
                        confidence_label="HIGH" if conf >= 0.8 else ("MEDIUM" if conf >= 0.6 else "LOW"),
                        script_language="ENGLISH",
                        font_size_mm=(font if k == "net_quantity" else None),
                        contrast_pass=(True if k == "mrp" else None),
                        clearance_pass=(True if k == "net_quantity" else None),
                        is_corrected=False,
                    )
                    if conf >= 0.8:
                        db.bounding_box = {"x": 1, "y": 1, "width": 200, "height": 24, "angle": 0}
                    session.add(db)
                await session.flush()

                # A couple officer corrections (feeds override KPI), harmless to verdict
                if status != "IN_PROGRESS":
                    corr_decl = (await session.execute(
                        select(Declaration).where(Declaration.inspection_id == insp.id,
                                                  Declaration.field_definition_id == fields["net_quantity_unit"].id)
                    )).scalar_one_or_none()
                    if corr_decl and corr_decl.confidence and corr_decl.confidence < 0.8:
                        corr_decl.is_corrected = True
                        corr_decl.correction_reason = "Officer confirmed SI unit symbol 'g'."

            else:
                # repair font/physical on re-run so evaluate stays stable
                if issue == "fail_mpe":
                    insp.physical_quantity = 230.0
                    insp.physical_unit = "g"
                    font_override = 2.5
                    netq = (await session.execute(
                        select(Declaration).where(Declaration.inspection_id == insp.id,
                                                  Declaration.field_definition_id == fields["net_quantity"].id)
                    )).scalar_one_or_none()
                    if netq:
                        netq.font_size_mm = font_override

            # Only evaluate when a verdict is missing (idempotent; don't clobber REVIEW/COMPLETED)
            if insp.compliance_result is None:
                overall, findings = await run_compliance_evaluation(insp.id, session)
                session.add(AuditEvent(actor_id=officer.id, action="COMPLIANCE_EVALUATED",
                                       entity_type="INSPECTION", entity_id=insp.id,
                                       new_value={"compliance_result": overall, "findings_count": len(findings)}))
                await session.commit()

            # Roll inspection to the demo stage
            if status == "COMPLETED":
                insp.status = "COMPLETED"
                insp.compliance_result = insp.compliance_result or "PASS"
                if insp.compliance_result == "PASS":
                    insp.final_decision = "APPROVED_COMPLIANT"
                elif insp.compliance_result == "FAIL":
                    insp.final_decision = "APPROVED_NON_COMPLIANT"
                else:
                    insp.final_decision = "APPROVED_COMPLIANT"
                insp.submitted_at = insp.submitted_at or (created_at + timedelta(hours=3))
                insp.finalized_at = insp.finalized_at or (created_at + timedelta(days=1))
            elif status == "UNDER_REVIEW":
                insp.status = "UNDER_REVIEW"
                insp.compliance_result = insp.compliance_result or "REVIEW"
                insp.submitted_at = insp.submitted_at or created_at + timedelta(hours=4)

            # Real PDF report for anything judged
            report = (await session.execute(select(Report).where(Report.inspection_id == insp.id))).scalar_one_or_none()
            if report is None and insp.compliance_result is not None:
                try:
                    await report_service.render_inspection_report(session, insp.id, officer.id)
                except Exception as exc:
                    print(f"  [!] report fail for {insp.id}: {exc}")
            await session.commit()
            print(f"  [+] {'[new]' if new else '[ok ]'} {brand} {commodity.generic_name} ({issue}) -> {insp.compliance_result}")

        await session.commit()
    print("✅ Demo World seeded.")


if __name__ == "__main__":
    asyncio.run(seed_demo_world())
