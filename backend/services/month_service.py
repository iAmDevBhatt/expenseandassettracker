from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.cash_flow_rows import CASH_FLOW_ROWS, EDITABLE_ROW_KEYS
from models.month_year import MonthYear
from models.cash_flow_entry import CashFlowEntry
from models.user import User


def get_all_months(user: User, db: Session) -> List[MonthYear]:
    return (
        db.query(MonthYear)
        .filter(MonthYear.user_id == user.id)
        .order_by(MonthYear.year.desc(), MonthYear.month.desc())
        .all()
    )


def get_or_create_month(year: int, month: int, user: User, db: Session) -> MonthYear:
    existing = (
        db.query(MonthYear)
        .filter_by(user_id=user.id, year=year, month=month)
        .first()
    )
    if existing:
        return existing

    my = MonthYear(user_id=user.id, year=year, month=month)
    db.add(my)
    db.flush()

    for row_key in EDITABLE_ROW_KEYS:
        row_def = CASH_FLOW_ROWS[row_key]
        entry = CashFlowEntry(
            month_year_id=my.id,
            row_key=row_key,
            sort_order=row_def.sort_order,
        )
        db.add(entry)

    db.commit()
    db.refresh(my)
    return my


def find_month(year: int, month: int, user: User, db: Session) -> MonthYear:
    """Returns the month if it exists, raises 404 if not. Never creates."""
    existing = db.query(MonthYear).filter_by(user_id=user.id, year=year, month=month).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Month not found")
    return existing


def create_month(year: int, month: int, user: User, db: Session) -> MonthYear:
    """Explicitly create a month. Raises 409 if it already exists."""
    existing = db.query(MonthYear).filter_by(user_id=user.id, year=year, month=month).first()
    if existing:
        raise HTTPException(status_code=409, detail="Month already exists")

    my = MonthYear(user_id=user.id, year=year, month=month)
    db.add(my)
    db.flush()

    for row_key in EDITABLE_ROW_KEYS:
        row_def = CASH_FLOW_ROWS[row_key]
        entry = CashFlowEntry(
            month_year_id=my.id,
            row_key=row_key,
            sort_order=row_def.sort_order,
        )
        db.add(entry)

    db.commit()
    db.refresh(my)
    return my


def get_month_by_id(month_year_id: int, user: User, db: Session) -> MonthYear:
    my = db.query(MonthYear).filter_by(id=month_year_id, user_id=user.id).first()
    if not my:
        raise HTTPException(status_code=404, detail="Month not found")
    return my


def delete_month(month_year_id: int, user: User, db: Session) -> None:
    my = get_month_by_id(month_year_id, user, db)
    db.delete(my)
    db.commit()
