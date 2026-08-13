from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class BudgetEntryUpsert(BaseModel):
    category: str
    amount_per_month: Decimal = Decimal("0")
    qty: int = Field(default=0, ge=0, le=12)


class BudgetEntryOut(BaseModel):
    id: int
    fy_start_year: int
    category: str
    amount_per_month: float
    qty: int

    model_config = {"from_attributes": True}


class BudgetEntriesBulkUpsert(BaseModel):
    fy_start_year: int
    entries: List[BudgetEntryUpsert]


class CategoryActual(BaseModel):
    category: str
    actual: float


class ActualsResponse(BaseModel):
    actuals: List[CategoryActual]
    total_actual: float


class MonthBreakdownItem(BaseModel):
    year: int
    month: int
    categories: dict


class MonthlySummaryItem(BaseModel):
    year: int
    month: int
    income: float
    spending: float
    investment: float


class BudgetSummaryUpsert(BaseModel):
    expected_income: Optional[Decimal] = None
    projected_loss_tax: Optional[Decimal] = None
    projected_target_saving: Optional[Decimal] = None
    targeted_saving: Optional[Decimal] = None
    actual_loss_tax: Optional[Decimal] = None


class BudgetSummaryOut(BaseModel):
    id: int
    fy_start_year: int
    expected_income: Optional[float]
    projected_loss_tax: Optional[float]
    projected_target_saving: Optional[float]
    targeted_saving: Optional[float]
    actual_loss_tax: Optional[float]

    model_config = {"from_attributes": True}
