from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class EntityCreate(BaseModel):
    legal_name: str = Field(min_length=1, max_length=300)
    type: str
    address: str = Field(min_length=1)
    state: Optional[str] = Field(default=None, max_length=100)
    pincode: Optional[str] = Field(default=None, max_length=10)
    gstin: Optional[str] = Field(default=None, max_length=20)


class EntityUpdate(BaseModel):
    legal_name: Optional[str] = Field(default=None, min_length=1, max_length=300)
    type: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None


class EntityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    legal_name: str
    type: str
    address: str
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    created_at: datetime


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    business_entity_id: UUID


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    business_entity_id: Optional[UUID] = None


class BrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    business_entity_id: UUID
    entity_name: Optional[str] = None
    created_at: datetime


class CommodityCreate(BaseModel):
    generic_name: str = Field(min_length=1, max_length=300)
    category: str = Field(min_length=1, max_length=100)
    brand_id: Optional[UUID] = None
    business_entity_id: Optional[UUID] = None
    barcode: Optional[str] = Field(default=None, max_length=100)
    sku: Optional[str] = Field(default=None, max_length=100)
    package_type: Optional[str] = Field(default="BOTTLE_BOX_POUCH", max_length=50)
    standard_pack_size: Optional[float] = None
    standard_pack_unit: Optional[str] = Field(default=None, max_length=20)


class CommodityUpdate(BaseModel):
    generic_name: Optional[str] = Field(default=None, min_length=1, max_length=300)
    category: Optional[str] = None
    brand_id: Optional[UUID] = None
    business_entity_id: Optional[UUID] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    package_type: Optional[str] = None
    standard_pack_size: Optional[float] = None
    standard_pack_unit: Optional[str] = None


class CommodityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    generic_name: str
    category: str
    brand_id: Optional[UUID] = None
    brand_name: Optional[str] = None
    business_entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    package_type: str
    standard_pack_size: Optional[float] = None
    standard_pack_unit: Optional[str] = None
    created_at: datetime


class CommodityListOut(BaseModel):
    commodities: List[CommodityOut]
    total: int
