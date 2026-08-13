from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class CashFlowEntryOut(BaseModel):
    row_key: str
    label: str
    amount: Decimal
    computed: bool
    sort_order: int


class CashFlowUpdate(BaseModel):
    amount: Decimal


class CashFlowBulkItem(BaseModel):
    row_key: str
    amount: Decimal
