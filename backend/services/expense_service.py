from decimal import Decimal
from typing import List
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.expense import Expense
from models.month_year import MonthYear
from models.user import User
from schemas.expense import ExpenseCreate, ExpenseUpdate


def list_expenses(month_year: MonthYear, db: Session) -> List[Expense]:
    return (
        db.query(Expense)
        .filter_by(month_year_id=month_year.id)
        .order_by(Expense.expense_date.asc())
        .all()
    )


def create_expense(month_year: MonthYear, data: ExpenseCreate, db: Session) -> Expense:
    expense = Expense(
        month_year_id=month_year.id,
        expense_date=data.expense_date,
        amount=data.amount,
        description=data.description,
        paid_via_cc=data.paid_via_cc,
        category=data.category,
        amount_cc=data.amount if data.paid_via_cc else None,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def get_expense(expense_id: int, user: User, db: Session) -> Expense:
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    month_year = db.query(MonthYear).filter_by(id=expense.month_year_id, user_id=user.id).first()
    if not month_year:
        raise HTTPException(status_code=403, detail="Access denied")
    return expense


def update_expense(expense_id: int, data: ExpenseUpdate, user: User, db: Session) -> Expense:
    expense = get_expense(expense_id, user, db)
    if data.expense_date is not None:
        expense.expense_date = data.expense_date
    if data.amount is not None:
        expense.amount = data.amount
    if data.description is not None:
        expense.description = data.description
    if data.paid_via_cc is not None:
        expense.paid_via_cc = data.paid_via_cc
    elif "paid_via_cc" in data.model_fields_set:
        expense.paid_via_cc = None
    if data.category is not None:
        expense.category = data.category

    expense.amount_cc = expense.amount if expense.paid_via_cc else None
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(expense_id: int, user: User, db: Session) -> None:
    expense = get_expense(expense_id, user, db)
    db.delete(expense)
    db.commit()


def sum_amount_cc(month_year: MonthYear, db: Session) -> Decimal:
    result = db.query(func.coalesce(func.sum(Expense.amount_cc), 0)).filter(
        Expense.month_year_id == month_year.id,
        Expense.amount_cc.isnot(None)
    ).scalar()
    return Decimal(str(result))


def sum_amount(month_year: MonthYear, db: Session) -> Decimal:
    result = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.month_year_id == month_year.id
    ).scalar()
    return Decimal(str(result))


def sum_by_category_value(month_year: MonthYear, category: str, db: Session) -> Decimal:
    result = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.month_year_id == month_year.id,
        Expense.category == category
    ).scalar()
    return Decimal(str(result))


def sum_by_categories(month_year: MonthYear, categories: List[str], db: Session) -> Decimal:
    if not categories:
        return Decimal("0")
    result = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.month_year_id == month_year.id,
        Expense.category.in_(categories)
    ).scalar()
    return Decimal(str(result))


def sum_by_all_categories(month_year: MonthYear, db: Session) -> List[dict]:
    rows = (
        db.query(Expense.category, func.sum(Expense.amount).label("total"))
        .filter_by(month_year_id=month_year.id)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    return [{"category": r.category, "amount": Decimal(str(r.total))} for r in rows]
