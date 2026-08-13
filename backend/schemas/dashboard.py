from decimal import Decimal
from typing import List
from pydantic import BaseModel

from schemas.cash_flow import CashFlowEntryOut


class CategoryRow(BaseModel):
    category: str
    amount: Decimal


class FinancialSummary(BaseModel):
    income: Decimal
    spent_minus_investment: Decimal
    investment: Decimal
    ignore: Decimal
    open: Decimal


class DashboardOut(BaseModel):
    category_summary: List[CategoryRow]
    cash_flow: List[CashFlowEntryOut]
    financial_summary: FinancialSummary
