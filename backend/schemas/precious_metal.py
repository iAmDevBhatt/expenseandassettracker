from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class PreciousMetalCreate(BaseModel):
    metal_type: Optional[str] = None
    carat: Optional[str] = None
    grams: Optional[Decimal] = None
    purchase_price: Optional[Decimal] = None
    amount_spent: Optional[Decimal] = None
    current_value_override: Optional[Decimal] = None


class PreciousMetalUpdate(PreciousMetalCreate):
    pass


class PreciousMetalOut(PreciousMetalCreate):
    id: int

    model_config = {"from_attributes": True}


class MetalPriceOut(BaseModel):
    price_per_gram: Optional[float]
    currency: str = "INR"
