from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    expense_date: date
    amount: Decimal
    description: Optional[str] = None
    paid_via_cc: Optional[str] = None
    category: str


class ExpenseUpdate(BaseModel):
    expense_date: Optional[date] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    paid_via_cc: Optional[str] = None
    category: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    expense_date: date
    amount: Decimal
    description: Optional[str]
    amount_cc: Optional[Decimal]
    paid_via_cc: Optional[str]
    category: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
