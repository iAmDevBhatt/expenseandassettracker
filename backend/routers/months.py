from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.month_year import MonthYearOut
from services import month_service

router = APIRouter(prefix="/api/months", tags=["months"])


@router.get("", response_model=List[MonthYearOut])
def list_months(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return month_service.get_all_months(current_user, db)


@router.get("/{year}/{month}", response_model=MonthYearOut)
def get_or_create_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return month_service.get_or_create_month(year, month, current_user, db)


@router.get("/{year}/{month}/check", response_model=MonthYearOut)
def check_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the month record if it exists, 404 if not. Never creates."""
    return month_service.find_month(year, month, current_user, db)


@router.post("/{year}/{month}", response_model=MonthYearOut, status_code=201)
def create_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Explicitly create a month. 409 if it already exists."""
    return month_service.create_month(year, month, current_user, db)


@router.delete("/{month_year_id}", status_code=204)
def delete_month(
    month_year_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_service.delete_month(month_year_id, current_user, db)
