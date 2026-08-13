from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class ProtectionTargetOut(BaseModel):
    id: int
    category: str
    current_value: Optional[Decimal]
    target_value: Optional[Decimal]

    model_config = {"from_attributes": True}


class ProtectionTargetUpdate(BaseModel):
    current_value: Optional[Decimal] = None
    target_value: Optional[Decimal] = None
