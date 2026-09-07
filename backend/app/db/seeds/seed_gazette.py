import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.user import Role, User
from app.models.master_data import FieldDefinition
from app.models.rules import RuleSet, Requirement


async def seed_database():
    print("🌱 Starting DoCA Gazette & Baseline Seeder...")
    async with AsyncSessionLocal() as session:
        # 1. Seed Roles
        roles_data = [
            {"name": "SUPERADMIN", "permissions": {"all": True}},
            {"name": "ADMIN", "permissions": {"manage_users": True, "manage_assignments": True, "manage_rules": True}},
            {"name": "REVIEWER", "permissions": {"review_inspections": True, "finalize_decisions": True}},
            {"name": "OFFICER", "permissions": {"execute_inspections": True, "upload_evidence": True}},
        ]
        roles = {}
        for r_data in roles_data:
            stmt = select(Role).where(Role.name == r_data["name"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                role = Role(name=r_data["name"], permissions=r_data["permissions"])
                session.add(role)
                await session.flush()
                roles[r_data["name"]] = role
                print(f"  [+] Role seeded: {r_data['name']}")
            else:
                roles[r_data["name"]] = existing

        # 2. Seed Default Users
        users_data = [
            {
                "email": "admin@doca.gov.in",
                "name": "DOCA Enforcement Admin",
                "role_name": "ADMIN",
                "employee_id": "DOCA-ADM-001",
                "password": "Admin@12345",
            },
            {
                "email": "reviewer@doca.gov.in",
                "name": "Senior Inspection Reviewer",
                "role_name": "REVIEWER",
                "employee_id": "DOCA-REV-101",
                "password": "Reviewer@12345",
            },
            {
                "email": "officer@doca.gov.in",
                "name": "Legal Metrology Inspector",
                "role_name": "OFFICER",
                "employee_id": "DOCA-OFF-202",
                "password": "Officer@12345",
            },
        ]
        for u_data in users_data:
            stmt = select(User).where(User.email == u_data["email"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                user = User(
                    email=u_data["email"],
                    name=u_data["name"],
                    employee_id=u_data["employee_id"],
                    role_id=roles[u_data["role_name"]].id,
                    password_hash=get_password_hash(u_data["password"]),
                )
                session.add(user)
                print(f"  [+] User seeded: {u_data['email']} ({u_data['role_name']})")

        # 3. Seed Field Definitions (Canonical Label Declarations)
        fields_data = [
            {"key": "mrp", "name": "Maximum Retail Price (MRP)", "type": "NUMERIC", "units": ["INR", "₹"]},
            {"key": "net_quantity", "name": "Net Quantity Value", "type": "NUMERIC", "units": None},
            {"key": "net_quantity_unit", "name": "Net Quantity SI Unit", "type": "STRING", "units": ["g", "kg", "ml", "l", "m", "cm", "N", "U"]},
            {"key": "mfg_date", "name": "Month and Year of Manufacture / Packing", "type": "DATE", "units": None},
            {"key": "expiry_date", "name": "Expiry / Best Before Date", "type": "DATE", "units": None},
            {"key": "generic_name", "name": "Common or Generic Commodity Name", "type": "STRING", "units": None},
            {"key": "manufacturer_name", "name": "Manufacturer Name", "type": "STRING", "units": None},
            {"key": "manufacturer_address", "name": "Manufacturer Complete Address", "type": "ADDRESS", "units": None},
            {"key": "packer_name", "name": "Packer Name", "type": "STRING", "units": None},
            {"key": "importer_name", "name": "Importer Name", "type": "STRING", "units": None},
            {"key": "consumer_care", "name": "Consumer Care Grievance Details", "type": "CONTACT", "units": None},
            {"key": "standard_pack_warning", "name": "Non-Standard Pack Size Disclaimer", "type": "STRING", "units": None},
        ]
        for f in fields_data:
            stmt = select(FieldDefinition).where(FieldDefinition.canonical_key == f["key"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                field = FieldDefinition(
                    canonical_key=f["key"],
                    display_name=f["name"],
                    data_type=f["type"],
                    allowed_units=f["units"],
                    is_mandatory=True,
                )
                session.add(field)
                print(f"  [+] Field Definition seeded: {f['key']}")

        # 4. Seed Active Gazette Rule Set (LM-PCR-2011-v1.0)
        rule_version = "LM-PCR-2011-v1.0"
        stmt = select(RuleSet).where(RuleSet.version == rule_version)
        existing_rule_set = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_rule_set:
            rule_set = RuleSet(
                version=rule_version,
                description="Legal Metrology (Packaged Commodities) Rules, 2011 Baseline Notification GSR 202(E)",
                is_active=True,
                effective_at=datetime.now(timezone.utc),
            )
            session.add(rule_set)
            await session.flush()
            print(f"  [+] Rule Set seeded: {rule_version}")
        else:
            rule_set = existing_rule_set

        # 5. Seed Requirements
        requirements_data = [
            {
                "ref": "Rule6(1)(a)",
                "title": "Manufacturer / Packer / Importer Complete Address",
                "desc": "Every package must bear the complete postal address of the manufacturer/packer/importer including factory/premises, city, state and PIN code.",
                "severity": "CRITICAL",
                "check": {"type": "address_completeness", "require_pincode": True},
            },
            {
                "ref": "Rule6(1)(b)",
                "title": "Common / Generic Name Declaration",
                "desc": "The common or generic name of the commodity must be prominently stated on the package.",
                "severity": "MAJOR",
                "check": {"type": "field_present", "field_key": "generic_name"},
            },
            {
                "ref": "Rule6(1)(c)",
                "title": "Net Quantity in Standard Units",
                "desc": "Net quantity must be expressed in standard SI units (g, kg, ml, l, m, cm, N, U) without misleading words.",
                "severity": "CRITICAL",
                "check": {"type": "si_unit_compliance", "forbidden_terms": ["approx", "approximately", "not less than", "minimum"]},
            },
            {
                "ref": "Rule6(1)(d)",
                "title": "Month and Year of Manufacture / Packing",
                "desc": "Package must state the month and year in which commodity is manufactured, packed or imported.",
                "severity": "CRITICAL",
                "check": {"type": "date_validity", "format": "MM/YYYY", "no_future_dates": True},
            },
            {
                "ref": "Rule6(1)(e)",
                "title": "MRP Inclusive of All Taxes",
                "desc": "Maximum Retail Price must be declared in rupees with the mandatory legend 'inclusive of all taxes' or 'incl. of all taxes'.",
                "severity": "CRITICAL",
                "check": {"type": "mrp_format", "require_taxes_inclusive": True},
            },
            {
                "ref": "Rule6(2)",
                "title": "Consumer Care Grievance Details",
                "desc": "Every package must bear the name, address, telephone number and email address for consumer complaints.",
                "severity": "CRITICAL",
                "check": {"type": "contact_completeness", "require_phone": True, "require_email": True},
            },
            {
                "ref": "Rule7_TableI",
                "title": "Minimum Font Height of Numerals & Letters",
                "desc": "Numeral and letter height must satisfy Table I based on net quantity: <=200g (1mm), 200-500g (2mm), >500g (4mm).",
                "severity": "CRITICAL",
                "check": {"type": "font_height_table_1", "tolerance_mm": 0.1},
            },
            {
                "ref": "Rule8(1)",
                "title": "Free Surrounding Space Around Net Quantity",
                "desc": "The area surrounding quantity declaration must be free from printed information by 1x numeral height above/below and 2x left/right.",
                "severity": "MAJOR",
                "check": {"type": "clearance_zone_check"},
            },
            {
                "ref": "Rule9(1)(b)",
                "title": "Conspicuous Color Contrast",
                "desc": "Numerals of retail price and net quantity must be printed in a color that contrasts conspicuously with the label background.",
                "severity": "MAJOR",
                "check": {"type": "contrast_ratio_check", "min_contrast_ratio": 3.0},
            },
            {
                "ref": "Rule9(4)",
                "title": "Approved Script Language",
                "desc": "Declarations must be either in Hindi in Devnagri script or in English.",
                "severity": "CRITICAL",
                "check": {"type": "script_language_check", "allowed": ["DEVANAGARI", "ENGLISH"]},
            },
        ]
        for req in requirements_data:
            stmt = select(Requirement).where(
                Requirement.rule_set_id == rule_set.id, Requirement.rule_ref == req["ref"]
            )
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                r = Requirement(
                    rule_set_id=rule_set.id,
                    rule_ref=req["ref"],
                    title=req["title"],
                    description=req["desc"],
                    severity=req["severity"],
                    check_logic=req["check"],
                )
                session.add(r)
                print(f"  [+] Requirement seeded: {req['ref']} - {req['title']}")

        await session.commit()
    print("✅ Gazette & Baseline Seeding Complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())
