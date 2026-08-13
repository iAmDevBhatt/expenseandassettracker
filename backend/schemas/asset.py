from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class AssetMonthlyValueOut(BaseModel):
    id: int
    asset_id: int
    month_key: str
    fy_start_year: int
    amount: Optional[Decimal]

    model_config = {"from_attributes": True}


class AssetMonthlyValueUpsert(BaseModel):
    amount: Optional[Decimal] = None


class AssetCreate(BaseModel):
    asset_category: Optional[str] = None
    asset_holder: Optional[str] = None
    asset_sub_category: Optional[str] = None
    account_number: Optional[str] = None
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
    monthly_values: List[AssetMonthlyValueOut] = []

    model_config = {"from_attributes": True}
