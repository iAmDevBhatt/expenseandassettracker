from datetime import datetime
from decimal import Decimal
from typing import List
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from core.cash_flow_rows import INCOME_ROW_KEYS
from models.budget_entry import BudgetEntry
from models.budget_summary import BudgetSummary
from models.cash_flow_entry import CashFlowEntry
from models.expense import Expense
from models.month_year import MonthYear
from models.user import User
from schemas.budget import (
    BudgetEntryUpsert,
    BudgetSummaryUpsert,
    CategoryActual,
    ActualsResponse,
    MonthBreakdownItem,
    MonthlySummaryItem,
)


def list_entries(user: User, fy_start_year: int, db: Session) -> List[BudgetEntry]:
    return (
        db.query(BudgetEntry)
        .filter_by(user_id=user.id, fy_start_year=fy_start_year)
        .order_by(BudgetEntry.category.asc())
        .all()
    )


def bulk_upsert_entries(
    user: User, fy_start_year: int, entries: List[BudgetEntryUpsert], db: Session
) -> List[BudgetEntry]:
    for item in entries:
        existing = (
            db.query(BudgetEntry)
            .filter_by(user_id=user.id, fy_start_year=fy_start_year, category=item.category)
            .first()
        )
        if existing:
            existing.amount_per_month = item.amount_per_month
            existing.qty = item.qty
            existing.updated_at = datetime.utcnow()
        else:
            db.add(BudgetEntry(
                user_id=user.id,
                fy_start_year=fy_start_year,
                category=item.category,
                amount_per_month=item.amount_per_month,
                qty=item.qty,
            ))
    db.commit()
    return list_entries(user, fy_start_year, db)


def _fy_months(fy_start_year: int):
    """Return list of (year, month) tuples for the full FY Apr→Mar."""
    months = []
    for m in range(4, 13):
        months.append((fy_start_year, m))
    for m in range(1, 4):
        months.append((fy_start_year + 1, m))
    return months


def get_actuals_by_category(
    user: User,
    start_year: int, start_month: int,
    end_year: int, end_month: int,
    db: Session,
) -> ActualsResponse:
    rows = (
        db.query(Expense.category, func.sum(Expense.amount).label("actual"))
        .join(MonthYear, Expense.month_year_id == MonthYear.id)
        .filter(
            MonthYear.user_id == user.id,
            or_(
                MonthYear.year > start_year,
                and_(MonthYear.year == start_year, MonthYear.month >= start_month),
            ),
            or_(
                MonthYear.year < end_year,
                and_(MonthYear.year == end_year, MonthYear.month <= end_month),
            ),
        )
        .group_by(Expense.category)
        .all()
    )
    actuals = [CategoryActual(category=r.category, actual=float(r.actual)) for r in rows]
    total = sum((a.actual for a in actuals), 0.0)
    return ActualsResponse(actuals=actuals, total_actual=total)


def get_monthly_breakdown(user: User, fy_start_year: int, db: Session) -> List[MonthBreakdownItem]:
    fy_months = _fy_months(fy_start_year)
    # Fetch all month_year records for this user that fall in the FY
    year_month_pairs = [
        and_(MonthYear.year == y, MonthYear.month == m) for y, m in fy_months
    ]
    month_years = (
        db.query(MonthYear)
        .filter(MonthYear.user_id == user.id, or_(*year_month_pairs))
        .all()
    )
    my_map = {(my.year, my.month): my.id for my in month_years}

    result = []
    for year, month in fy_months:
        my_id = my_map.get((year, month))
        categories: dict = {}
        if my_id:
            rows = (
                db.query(Expense.category, func.sum(Expense.amount).label("total"))
                .filter(Expense.month_year_id == my_id)
                .group_by(Expense.category)
                .all()
            )
            categories = {r.category: float(Decimal(str(r.total))) for r in rows}
        result.append(MonthBreakdownItem(year=year, month=month, categories=categories))
    return result


def get_monthly_summary(user: User, fy_start_year: int, db: Session) -> List[MonthlySummaryItem]:
    fy_months = _fy_months(fy_start_year)
    year_month_pairs = [
        and_(MonthYear.year == y, MonthYear.month == m) for y, m in fy_months
    ]
    month_years = (
        db.query(MonthYear)
        .filter(MonthYear.user_id == user.id, or_(*year_month_pairs))
        .all()
    )
    my_map = {(my.year, my.month): my.id for my in month_years}

    result = []
    for year, month in fy_months:
        my_id = my_map.get((year, month))
        income = 0.0
        spending = 0.0
        investment = 0.0

        if my_id:
            # Income: sum of INCOME_ROW_KEYS from cash_flow_entries
            cf_rows = (
                db.query(CashFlowEntry)
                .filter(
                    CashFlowEntry.month_year_id == my_id,
                    CashFlowEntry.row_key.in_(INCOME_ROW_KEYS),
                )
                .all()
            )
            income = sum((float(r.manual_amount or 0) for r in cf_rows), 0.0)

            # Total spending (all expenses)
            total_exp = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
                Expense.month_year_id == my_id
            ).scalar()
            spending = float(total_exp)

            # Investment category
            inv_exp = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
                Expense.month_year_id == my_id,
                Expense.category == "Investment",
            ).scalar()
            investment = float(inv_exp)

        result.append(MonthlySummaryItem(
            year=year, month=month,
            income=income, spending=spending, investment=investment,
        ))
    return result


def get_or_create_summary(user: User, fy_start_year: int, db: Session) -> BudgetSummary:
    summary = db.query(BudgetSummary).filter_by(user_id=user.id, fy_start_year=fy_start_year).first()
    if not summary:
        summary = BudgetSummary(user_id=user.id, fy_start_year=fy_start_year)
        db.add(summary)
        db.commit()
        db.refresh(summary)
    return summary


def update_summary(user: User, fy_start_year: int, data: BudgetSummaryUpsert, db: Session) -> BudgetSummary:
    summary = get_or_create_summary(user, fy_start_year, db)
    for field, value in data.model_dump(exclude_unset=False).items():
        setattr(summary, field, value)
    summary.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(summary)
    return summary
