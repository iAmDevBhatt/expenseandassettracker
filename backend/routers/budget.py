from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.budget import (
    BudgetEntryOut,
    BudgetEntriesBulkUpsert,
    ActualsResponse,
    MonthBreakdownItem,
    MonthlySummaryItem,
    BudgetSummaryOut,
    BudgetSummaryUpsert,
)
from services import budget_service

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("/{fy_start_year}/entries", response_model=List[BudgetEntryOut])
def get_entries(
    fy_start_year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.list_entries(current_user, fy_start_year, db)


@router.put("/{fy_start_year}/entries", response_model=List[BudgetEntryOut])
def upsert_entries(
    fy_start_year: int,
    data: BudgetEntriesBulkUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.bulk_upsert_entries(current_user, fy_start_year, data.entries, db)


@router.get("/{fy_start_year}/actuals", response_model=ActualsResponse)
def get_actuals(
    fy_start_year: int,
    start_year: int = Query(...),
    start_month: int = Query(...),
    end_year: int = Query(...),
    end_month: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.get_actuals_by_category(
        current_user, start_year, start_month, end_year, end_month, db
    )


@router.get("/{fy_start_year}/monthly-breakdown", response_model=List[MonthBreakdownItem])
def get_monthly_breakdown(
    fy_start_year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.get_monthly_breakdown(current_user, fy_start_year, db)


@router.get("/{fy_start_year}/monthly-summary", response_model=List[MonthlySummaryItem])
def get_monthly_summary(
    fy_start_year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.get_monthly_summary(current_user, fy_start_year, db)


@router.get("/{fy_start_year}/summary", response_model=BudgetSummaryOut)
def get_summary(
    fy_start_year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.get_or_create_summary(current_user, fy_start_year, db)


@router.put("/{fy_start_year}/summary", response_model=BudgetSummaryOut)
def update_summary(
    fy_start_year: int,
    data: BudgetSummaryUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return budget_service.update_summary(current_user, fy_start_year, data, db)
