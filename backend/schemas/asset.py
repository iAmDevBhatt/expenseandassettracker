from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class AssetCreate(BaseModel):
    asset_category: Optional[str] = None
    asset_holder: Optional[str] = None
    asset_sub_category: Optional[str] = None
    name: Optional[str] = None
    current_value: Optional[Decimal] = None
    notes: Optional[str] = None
    as_of_date: Optional[date] = None


class AssetUpdate(AssetCreate):
    pass


class AssetOut(AssetCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
