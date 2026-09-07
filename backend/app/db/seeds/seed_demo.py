import asyncio
from datetime import date, timedelta
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.master_data import Brand, BusinessEntity, Commodity
from app.models.rules import RuleSet
from app.models.workflow import Assignment


ENTITIES = [
    {
        "legal_name": "Sunrise Foods Pvt Ltd",
        "type": "MANUFACTURER",
        "address": "Plot 14, MIDC Industrial Area, Chakan, Pune",
        "state": "Maharashtra",
        "pincode": "410501",
        "gstin": "27AAKCS1234F1Z5",
    },
    {
        "legal_name": "Ganga Packwell Industries",
        "type": "PACKER",
        "address": "88 GT Road, Sahibabad Industrial Area, Ghaziabad",
        "state": "Uttar Pradesh",
        "pincode": "201010",
        "gstin": "09AAKCG5678P1Z2",
    },
    {
        "legal_name": "Meridian Imports LLP",
        "type": "IMPORTER",
        "address": "3rd Floor, Trade House, Ballard Estate, Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "gstin": "27AAKCM9012L1Z8",
    },
]

BRANDS = [
    {"name": "Sunrise Gold", "entity": "Sunrise Foods Pvt Ltd"},
    {"name": "FarmFresh", "entity": "Sunrise Foods Pvt Ltd"},
    {"name": "PackWell", "entity": "Ganga Packwell Industries"},
    {"name": "Meridian Select", "entity": "Meridian Imports LLP"},
]

COMMODITIES = [
    {"generic_name": "Glucose Biscuits", "category": "BISCUITS", "brand": "Sunrise Gold", "barcode": "8901001230011", "sku": "SUN-GB-100G", "size": 100, "unit": "g"},
    {"generic_name": "Glucose Biscuits Family Pack", "category": "BISCUITS", "brand": "Sunrise Gold", "barcode": "8901001230028", "sku": "SUN-GB-500G", "size": 500, "unit": "g"},
    {"generic_name": "CTC Tea", "category": "TEA", "brand": "FarmFresh", "barcode": "8901001230035", "sku": "FRM-TEA-250G", "size": 250, "unit": "g"},
    {"generic_name": "Whole Wheat Atta", "category": "ATTA", "brand": "FarmFresh", "barcode": "8901001230042", "sku": "FRM-ATTA-5KG", "size": 5, "unit": "kg"},
    {"generic_name": "Mustard Oil", "category": "EDIBLE_OIL", "brand": "PackWell", "barcode": "8901001230059", "sku": "PKW-MO-1L", "size": 1, "unit": "l"},
    {"generic_name": "Bathing Soap Bar", "category": "SOAP", "brand": "PackWell", "barcode": "8901001230066", "sku": "PKW-SOAP-125G", "size": 125, "unit": "g"},
    {"generic_name": "Instant Coffee Jar", "category": "COFFEE", "brand": "Meridian Select", "barcode": "8901001230073", "sku": "MER-COF-200G", "size": 200, "unit": "g"},
    {"generic_name": "Non-Standard Snack Tub", "category": "SNACKS", "brand": "Meridian Select", "barcode": "8901001230080", "sku": "MER-SNK-333G", "size": 333, "unit": "g"},
]


async def seed_demo():
    print("Seeding demo catalog + assignments...")
    async with AsyncSessionLocal() as session:
        entities = {}
        for e in ENTITIES:
            stmt = select(BusinessEntity).where(BusinessEntity.legal_name == e["legal_name"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                existing = BusinessEntity(**e)
                session.add(existing)
                await session.flush()
                print(f"  [+] Entity: {e['legal_name']}")
            entities[e["legal_name"]] = existing

        brands = {}
        for b in BRANDS:
            stmt = select(Brand).where(Brand.name == b["name"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                existing = Brand(
                    name=b["name"],
                    business_entity_id=entities[b["entity"]].id,
                )
                session.add(existing)
                await session.flush()
                print(f"  [+] Brand: {b['name']}")
            brands[b["name"]] = existing

        commodities = []
        for c in COMMODITIES:
            stmt = select(Commodity).where(Commodity.barcode == c["barcode"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                brand = brands[c["brand"]]
                existing = Commodity(
                    brand_id=brand.id,
                    business_entity_id=brand.business_entity_id,
                    generic_name=c["generic_name"],
                    category=c["category"],
                    barcode=c["barcode"],
                    sku=c["sku"],
                    package_type="BOTTLE_BOX_POUCH",
                    standard_pack_size=c["size"],
                    standard_pack_unit=c["unit"],
                )
                session.add(existing)
                await session.flush()
                print(f"  [+] Commodity: {c['generic_name']} ({c['barcode']})")
            commodities.append(existing)

        admin = (await session.execute(select(User).where(User.email == "admin@doca.gov.in"))).scalar_one_or_none()
        officer = (await session.execute(select(User).where(User.email == "officer@doca.gov.in"))).scalar_one_or_none()
        rule_set = (await session.execute(select(RuleSet).where(RuleSet.is_active == True))).scalar_one_or_none()

        if admin and officer and rule_set:
            for i, commodity in enumerate(commodities[:5]):
                stmt = select(Assignment).where(
                    Assignment.commodity_id == commodity.id,
                    Assignment.assigned_to == officer.id,
                    Assignment.status == "ASSIGNED",
                )
                existing = (await session.execute(stmt)).scalar_one_or_none()
                if not existing:
                    session.add(
                        Assignment(
                            commodity_id=commodity.id,
                            assigned_by=admin.id,
                            assigned_to=officer.id,
                            rule_set_id=rule_set.id,
                            status="ASSIGNED",
                            due_date=date.today() + timedelta(days=7 - i),
                            notes=f"Demo field visit {i + 1}: verify MRP, net qty, font height.",
                        )
                    )
                    print(f"  [+] Assignment: {commodity.generic_name} -> officer@doca.gov.in")
        else:
            print("  [!] Skipped assignments: run seed_gazette.py first (needs admin/officer users + active rule set).")

        await session.commit()
    print("Demo seed complete.")


if __name__ == "__main__":
    asyncio.run(seed_demo())
