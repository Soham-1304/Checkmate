from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import AuditEvent
from app.models.master_data import Brand, BusinessEntity, Commodity, FieldDefinition
from app.models.user import User
from app.schemas.masters import (
    BrandCreate,
    BrandOut,
    BrandUpdate,
    CommodityCreate,
    CommodityListOut,
    CommodityOut,
    CommodityUpdate,
    EntityCreate,
    EntityOut,
    EntityUpdate,
    FieldDefinitionOut,
)

router = APIRouter(tags=["Master Data"])
write_guard = Depends(require_capability("can_manage_master_data"))

ENTITY_TYPES = {"MANUFACTURER", "PACKER", "IMPORTER", "BRAND_OWNER"}


def _brand_out(b: Brand) -> BrandOut:
    return BrandOut(
        id=b.id, name=b.name, business_entity_id=b.business_entity_id,
        entity_name=b.business_entity.legal_name if b.business_entity else None,
        created_at=b.created_at,
    )


def _commodity_out(c: Commodity) -> CommodityOut:
    return CommodityOut(
        id=c.id, generic_name=c.generic_name, category=c.category,
        brand_id=c.brand_id, brand_name=c.brand.name if c.brand else None,
        business_entity_id=c.business_entity_id,
        entity_name=c.business_entity.legal_name if c.business_entity else None,
        barcode=c.barcode, sku=c.sku, package_type=c.package_type,
        standard_pack_size=float(c.standard_pack_size) if c.standard_pack_size is not None else None,
        standard_pack_unit=c.standard_pack_unit, created_at=c.created_at,
    )


# ---------- Entities ----------

@router.post("/entities", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
async def create_entity(payload: EntityCreate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    if payload.type.upper() not in ENTITY_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Type must be one of {sorted(ENTITY_TYPES)}.")
    entity = BusinessEntity(legal_name=payload.legal_name, type=payload.type.upper(), address=payload.address, state=payload.state, pincode=payload.pincode, gstin=payload.gstin)
    db.add(entity)
    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="ENTITY_CREATED", entity_type="BUSINESS_ENTITY", entity_id=entity.id, new_value={"legal_name": entity.legal_name, "type": entity.type}))
    await db.commit()
    await db.refresh(entity)
    return entity


@router.get("/entities", response_model=List[EntityOut])
async def list_entities(
    type: Optional[str] = None, q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    stmt = select(BusinessEntity)
    if type:
        stmt = stmt.where(BusinessEntity.type == type.upper())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(BusinessEntity.legal_name.ilike(like), BusinessEntity.state.ilike(like), BusinessEntity.gstin.ilike(like)))
    return (await db.execute(stmt.order_by(BusinessEntity.legal_name).offset(offset).limit(limit))).scalars().all()


@router.get("/entities/{entity_id}", response_model=EntityOut)
async def get_entity(entity_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    entity = (await db.execute(select(BusinessEntity).where(BusinessEntity.id == entity_id))).scalar_one_or_none()
    if not entity:
        raise EntityNotFoundException("BusinessEntity", entity_id)
    return entity


@router.patch("/entities/{entity_id}", response_model=EntityOut)
async def update_entity(entity_id: UUID, payload: EntityUpdate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    entity = (await db.execute(select(BusinessEntity).where(BusinessEntity.id == entity_id))).scalar_one_or_none()
    if not entity:
        raise EntityNotFoundException("BusinessEntity", entity_id)
    changes = {}
    for field in ("legal_name", "address", "state", "pincode", "gstin"):
        val = getattr(payload, field)
        if val is not None:
            setattr(entity, field, val)
            changes[field] = val
    if payload.type is not None:
        if payload.type.upper() not in ENTITY_TYPES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Type must be one of {sorted(ENTITY_TYPES)}.")
        entity.type = payload.type.upper()
        changes["type"] = entity.type
    db.add(AuditEvent(actor_id=current_user.id, action="ENTITY_UPDATED", entity_type="BUSINESS_ENTITY", entity_id=entity.id, new_value=changes))
    await db.commit()
    await db.refresh(entity)
    return entity


@router.get("/entities/{entity_id}/brands", response_model=List[BrandOut])
async def entity_brands(entity_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (await db.execute(select(BusinessEntity.id).where(BusinessEntity.id == entity_id))).scalar_one_or_none():
        raise EntityNotFoundException("BusinessEntity", entity_id)
    brands = (await db.execute(select(Brand).options(selectinload(Brand.business_entity)).where(Brand.business_entity_id == entity_id).order_by(Brand.name))).scalars().all()
    return [_brand_out(b) for b in brands]


# ---------- Brands ----------

@router.post("/brands", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
async def create_brand(payload: BrandCreate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    entity = (await db.execute(select(BusinessEntity).where(BusinessEntity.id == payload.business_entity_id))).scalar_one_or_none()
    if not entity:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "business_entity_id does not exist.")
    brand = Brand(name=payload.name, business_entity_id=payload.business_entity_id)
    db.add(brand)
    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="BRAND_CREATED", entity_type="BRAND", entity_id=brand.id, new_value={"name": brand.name}))
    await db.commit()
    brand = (await db.execute(select(Brand).options(selectinload(Brand.business_entity)).where(Brand.id == brand.id))).scalar_one()
    return _brand_out(brand)


@router.get("/brands", response_model=List[BrandOut])
async def list_brands(q: Optional[str] = None, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Brand).options(selectinload(Brand.business_entity))
    if q:
        stmt = stmt.where(Brand.name.ilike(f"%{q}%"))
    brands = (await db.execute(stmt.order_by(Brand.name).offset(offset).limit(limit))).scalars().all()
    return [_brand_out(b) for b in brands]


@router.get("/brands/{brand_id}/commodities", response_model=List[CommodityOut])
async def brand_commodities(brand_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (await db.execute(select(Brand.id).where(Brand.id == brand_id))).scalar_one_or_none():
        raise EntityNotFoundException("Brand", brand_id)
    rows = (await db.execute(select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity)).where(Commodity.brand_id == brand_id).order_by(Commodity.generic_name))).scalars().all()
    return [_commodity_out(c) for c in rows]


@router.patch("/brands/{brand_id}", response_model=BrandOut)
async def update_brand(brand_id: UUID, payload: BrandUpdate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    brand = (await db.execute(select(Brand).options(selectinload(Brand.business_entity)).where(Brand.id == brand_id))).scalar_one_or_none()
    if not brand:
        raise EntityNotFoundException("Brand", brand_id)
    changes = {}
    if payload.name is not None:
        brand.name = payload.name
        changes["name"] = payload.name
    if payload.business_entity_id is not None:
        if not (await db.execute(select(BusinessEntity.id).where(BusinessEntity.id == payload.business_entity_id))).scalar_one_or_none():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "business_entity_id does not exist.")
        brand.business_entity_id = payload.business_entity_id
        changes["business_entity_id"] = str(payload.business_entity_id)
    db.add(AuditEvent(actor_id=current_user.id, action="BRAND_UPDATED", entity_type="BRAND", entity_id=brand.id, new_value=changes))
    await db.commit()
    brand = (await db.execute(select(Brand).options(selectinload(Brand.business_entity)).where(Brand.id == brand.id))).scalar_one()
    return _brand_out(brand)


# ---------- Commodities (search BEFORE /{id}) ----------

@router.get("/commodities/search", response_model=List[CommodityOut])
async def search_commodities(
    barcode: Optional[str] = None, q: Optional[str] = None, category: Optional[str] = None,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if not barcode and not q and not category:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide at least one of: barcode, q, category.")
    stmt = select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity))
    if barcode:
        stmt = stmt.where(Commodity.barcode == barcode)
    if category:
        stmt = stmt.where(Commodity.category.ilike(category))
    if q:
        like = f"%{q}%"
        stmt = stmt.join(Brand, Commodity.brand_id == Brand.id, isouter=True).where(or_(Commodity.generic_name.ilike(like), Commodity.sku.ilike(like), Brand.name.ilike(like)))
    rows = (await db.execute(stmt.order_by(Commodity.generic_name).limit(50))).scalars().all()
    return [_commodity_out(c) for c in rows]


@router.post("/commodities", response_model=CommodityOut, status_code=status.HTTP_201_CREATED)
async def create_commodity(payload: CommodityCreate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    if payload.barcode:
        dup = (await db.execute(select(Commodity.id).where(Commodity.barcode == payload.barcode))).scalar_one_or_none()
        if dup:
            raise HTTPException(status.HTTP_409_CONFLICT, "Barcode already registered.")
    if payload.brand_id and not (await db.execute(select(Brand.id).where(Brand.id == payload.brand_id))).scalar_one_or_none():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "brand_id does not exist.")
    if payload.business_entity_id and not (await db.execute(select(BusinessEntity.id).where(BusinessEntity.id == payload.business_entity_id))).scalar_one_or_none():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "business_entity_id does not exist.")
    c = Commodity(
        generic_name=payload.generic_name, category=payload.category, brand_id=payload.brand_id,
        business_entity_id=payload.business_entity_id, barcode=payload.barcode, sku=payload.sku,
        package_type=payload.package_type or "BOTTLE_BOX_POUCH",
        standard_pack_size=payload.standard_pack_size, standard_pack_unit=payload.standard_pack_unit,
    )
    db.add(c)
    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="COMMODITY_CREATED", entity_type="COMMODITY", entity_id=c.id, new_value={"generic_name": c.generic_name, "barcode": c.barcode}))
    await db.commit()
    c = (await db.execute(select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity)).where(Commodity.id == c.id))).scalar_one()
    return _commodity_out(c)


@router.get("/commodities", response_model=CommodityListOut)
async def list_commodities(
    category: Optional[str] = None, q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    stmt = select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity))
    count_stmt = select(func.count()).select_from(Commodity)
    if category:
        stmt = stmt.where(Commodity.category.ilike(category))
        count_stmt = count_stmt.where(Commodity.category.ilike(category))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Commodity.generic_name.ilike(like), Commodity.sku.ilike(like), Commodity.barcode.ilike(like)))
        count_stmt = count_stmt.where(or_(Commodity.generic_name.ilike(like), Commodity.sku.ilike(like), Commodity.barcode.ilike(like)))
    total = (await db.execute(count_stmt)).scalar()
    rows = (await db.execute(stmt.order_by(Commodity.generic_name).offset(offset).limit(limit))).scalars().all()
    return CommodityListOut(commodities=[_commodity_out(c) for c in rows], total=total)


@router.get("/commodities/{commodity_id}", response_model=CommodityOut)
async def get_commodity(commodity_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = (await db.execute(select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity)).where(Commodity.id == commodity_id))).scalar_one_or_none()
    if not c:
        raise EntityNotFoundException("Commodity", commodity_id)
    return _commodity_out(c)


@router.patch("/commodities/{commodity_id}", response_model=CommodityOut)
async def update_commodity(commodity_id: UUID, payload: CommodityUpdate, db: AsyncSession = Depends(get_db), current_user: User = write_guard):
    c = (await db.execute(select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity)).where(Commodity.id == commodity_id))).scalar_one_or_none()
    if not c:
        raise EntityNotFoundException("Commodity", commodity_id)
    changes = {}
    for field in ("generic_name", "category", "sku", "package_type", "standard_pack_size", "standard_pack_unit"):
        val = getattr(payload, field)
        if val is not None:
            setattr(c, field, val)
            changes[field] = val
    if payload.barcode is not None:
        dup = (await db.execute(select(Commodity.id).where(Commodity.barcode == payload.barcode, Commodity.id != commodity_id))).scalar_one_or_none()
        if dup:
            raise HTTPException(status.HTTP_409_CONFLICT, "Barcode already registered.")
        c.barcode = payload.barcode
        changes["barcode"] = payload.barcode
    if payload.brand_id is not None:
        if not (await db.execute(select(Brand.id).where(Brand.id == payload.brand_id))).scalar_one_or_none():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "brand_id does not exist.")
        c.brand_id = payload.brand_id
        changes["brand_id"] = str(payload.brand_id)
    if payload.business_entity_id is not None:
        if not (await db.execute(select(BusinessEntity.id).where(BusinessEntity.id == payload.business_entity_id))).scalar_one_or_none():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "business_entity_id does not exist.")
        c.business_entity_id = payload.business_entity_id
        changes["business_entity_id"] = str(payload.business_entity_id)
    db.add(AuditEvent(actor_id=current_user.id, action="COMMODITY_UPDATED", entity_type="COMMODITY", entity_id=c.id, new_value=changes))
    await db.commit()
    c = (await db.execute(select(Commodity).options(selectinload(Commodity.brand), selectinload(Commodity.business_entity)).where(Commodity.id == c.id))).scalar_one()
    return _commodity_out(c)


# ---------- Field Definitions ----------

@router.get("/field-definitions", response_model=List[FieldDefinitionOut])
async def list_field_definitions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(FieldDefinition).order_by(FieldDefinition.display_name)
    return (await db.execute(stmt)).scalars().all()
