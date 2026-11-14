from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AssetBlueprintCreate(BaseModel):
    name: str
    asset_category: Optional[str] = None
    asset_sub_category: Optional[str] = None
    asset_holder: Optional[str] = None
    account_number: Optional[str] = None
    sort_order: Optional[int] = None


class AssetBlueprintUpdate(BaseModel):
    name: Optional[str] = None
    asset_category: Optional[str] = None
    asset_sub_category: Optional[str] = None
    asset_holder: Optional[str] = None
    account_number: Optional[str] = None
    sort_order: Optional[int] = None


class AssetBlueprintOut(BaseModel):
    id: int
    name: str
    asset_category: Optional[str]
    asset_sub_category: Optional[str]
    asset_holder: Optional[str]
    account_number: Optional[str]
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
