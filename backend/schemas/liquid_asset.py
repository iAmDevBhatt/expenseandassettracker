from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class LiquidAssetOut(BaseModel):
    id: int
    current_fixed: Optional[Decimal]
    current_savings: Optional[Decimal]
    current_cash: Optional[Decimal]
    target_fixed: Optional[Decimal]
    target_savings: Optional[Decimal]
    target_cash: Optional[Decimal]

    model_config = {"from_attributes": True}


class LiquidAssetUpdate(BaseModel):
    current_fixed: Optional[Decimal] = None
    current_savings: Optional[Decimal] = None
    current_cash: Optional[Decimal] = None
    target_fixed: Optional[Decimal] = None
    target_savings: Optional[Decimal] = None
    target_cash: Optional[Decimal] = None
