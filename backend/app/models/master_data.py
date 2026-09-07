import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class BusinessEntity(Base):
    __tablename__ = "business_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legal_name = Column(String(300), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'MANUFACTURER', 'PACKER', 'IMPORTER', 'BRAND_OWNER'
    address = Column(Text, nullable=False)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    gstin = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    brands = relationship("Brand", back_populates="business_entity")
    commodities = relationship("Commodity", back_populates="business_entity")


class Brand(Base):
    __tablename__ = "brands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_entity_id = Column(UUID(as_uuid=True), ForeignKey("business_entities.id"), nullable=False)
    name = Column(String(200), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    business_entity = relationship("BusinessEntity", back_populates="brands")
    commodities = relationship("Commodity", back_populates="brand")


class Commodity(Base):
    __tablename__ = "commodities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    business_entity_id = Column(UUID(as_uuid=True), ForeignKey("business_entities.id"), nullable=True)
    generic_name = Column(String(300), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # maps to Second Schedule
    barcode = Column(String(100), unique=True, index=True, nullable=True)
    sku = Column(String(100), nullable=True)
    package_type = Column(String(50), default="BOTTLE_BOX_POUCH", nullable=False)
    standard_pack_size = Column(Numeric(10, 2), nullable=True)
    standard_pack_unit = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    brand = relationship("Brand", back_populates="commodities")
    business_entity = relationship("BusinessEntity", back_populates="commodities")
    assignments = relationship("Assignment", back_populates="commodity")
    inspections = relationship("Inspection", back_populates="commodity")


class FieldDefinition(Base):
    __tablename__ = "field_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_key = Column(String(100), unique=True, index=True, nullable=False)
    # 'mrp', 'net_quantity', 'mfg_date', 'expiry_date', 'manufacturer_name',
    # 'manufacturer_address', 'packer_name', 'importer_name', 'consumer_care',
    # 'generic_name', 'dimension', 'standard_pack_warning'
    display_name = Column(String(200), nullable=False)
    data_type = Column(String(50), nullable=False)  # 'STRING', 'NUMERIC', 'DATE', 'ADDRESS', 'CONTACT'
    allowed_units = Column(JSONB, nullable=True)     # ['g', 'kg', 'ml', 'l', 'N', 'U']
    is_mandatory = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)

    declarations = relationship("Declaration", back_populates="field_definition")
