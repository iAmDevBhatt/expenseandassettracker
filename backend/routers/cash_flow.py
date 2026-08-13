from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.cash_flow import CashFlowEntryOut, CashFlowUpdate, CashFlowBulkItem
from services import cash_flow_service, expense_service, month_service

router = APIRouter(tags=["cash_flow"])


def _get_computed(month_year_id: int, current_user: User, db: Session):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    spent_via_cc = expense_service.sum_amount_cc(month_year, db)
    total = expense_service.sum_amount(month_year, db)
    spent = total - spent_via_cc
    return month_year, spent_via_cc, spent


@router.get("/api/months/{month_year_id}/cashflow", response_model=List[CashFlowEntryOut])
def get_cash_flow(
    month_year_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year, spent_via_cc, spent = _get_computed(month_year_id, current_user, db)
    return cash_flow_service.get_cash_flow(month_year, spent_via_cc, spent, db)


@router.put("/api/months/{month_year_id}/cashflow/{row_key}", response_model=CashFlowEntryOut)
def update_row(
    month_year_id: int,
    row_key: str,
    data: CashFlowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    return cash_flow_service.update_row(month_year, row_key, data.amount, db)


@router.post("/api/months/{month_year_id}/cashflow/bulk", response_model=List[CashFlowEntryOut])
def bulk_update(
    month_year_id: int,
    items: List[CashFlowBulkItem],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    return cash_flow_service.bulk_update(month_year, items, db)
