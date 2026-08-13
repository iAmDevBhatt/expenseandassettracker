from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from services import expense_service, month_service

router = APIRouter(tags=["expenses"])


@router.get("/api/months/{month_year_id}/expenses", response_model=List[ExpenseOut])
def list_expenses(
    month_year_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    return expense_service.list_expenses(month_year, db)


@router.post("/api/months/{month_year_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(
    month_year_id: int,
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    return expense_service.create_expense(month_year, data, db)


@router.put("/api/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return expense_service.update_expense(expense_id, data, current_user, db)


@router.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense_service.delete_expense(expense_id, current_user, db)
