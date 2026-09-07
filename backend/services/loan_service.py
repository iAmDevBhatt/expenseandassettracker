from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from models.loan import (
    LoanSettings,
    LoanAccountColumn,
    LoanEntry,
    LoanEntryAmount,
    LoanGiven,
)
from models.user import User
from schemas.loan import (
    LoanSettingsUpdate,
    LoanColumnCreate,
    LoanEntryCreate,
    LoanEntryUpdate,
    LoanFYDataOut,
    LoanEntryOut,
    LoanPriorOut,
    LoanGivenCreate,
    LoanGivenUpdate,
)

VALID_SIDES = {"WITHDRAWN", "CREDITED"}


# ── Settings ──────────────────────────────────────────────────────────────────
def get_settings(user: User, db: Session) -> LoanSettings:
    row = db.query(LoanSettings).filter_by(user_id=user.id).first()
    if not row:
        row = LoanSettings(user_id=user.id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_settings(user: User, data: LoanSettingsUpdate, db: Session) -> LoanSettings:
    row = get_settings(user, db)
    row.personal_loan_interest_pct = data.personal_loan_interest_pct
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


# ── Account columns ───────────────────────────────────────────────────────────
def list_columns(user: User, db: Session) -> List[LoanAccountColumn]:
    return (
        db.query(LoanAccountColumn)
        .filter_by(user_id=user.id)
        .order_by(LoanAccountColumn.sort_order.asc(), LoanAccountColumn.id.asc())
        .all()
    )


def add_column(user: User, data: LoanColumnCreate, db: Session) -> LoanAccountColumn:
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Column name is required")
    existing = db.query(LoanAccountColumn).filter_by(user_id=user.id, name=name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Column '{name}' already exists")
    order = db.query(LoanAccountColumn).filter_by(user_id=user.id).count()
    col = LoanAccountColumn(user_id=user.id, name=name, sort_order=order)
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


def delete_column(user: User, column_id: int, db: Session) -> None:
    col = db.query(LoanAccountColumn).filter_by(id=column_id, user_id=user.id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    entry_ids = [e.id for e in db.query(LoanEntry.id).filter_by(user_id=user.id).all()]
    if entry_ids:
        db.query(LoanEntryAmount).filter(
            LoanEntryAmount.loan_entry_id.in_(entry_ids),
            LoanEntryAmount.account_name == col.name,
        ).delete(synchronize_session=False)
    db.delete(col)
    db.commit()


# ── Ledger entries ────────────────────────────────────────────────────────────
def _entry_to_out(entry: LoanEntry) -> LoanEntryOut:
    return LoanEntryOut(
        id=entry.id,
        side=entry.side,
        entry_date=entry.entry_date,
        amounts={
            a.account_name: (float(a.amount) if a.amount is not None else None)
            for a in entry.amounts
        },
    )


def get_fy_data(user: User, fy_start_year: int, db: Session) -> LoanFYDataOut:
    entries = (
        db.query(LoanEntry)
        .options(selectinload(LoanEntry.amounts))
        .filter_by(user_id=user.id, fy_start_year=fy_start_year)
        .order_by(LoanEntry.entry_date.asc(), LoanEntry.id.asc())
        .all()
    )
    withdrawn = [_entry_to_out(e) for e in entries if e.side == "WITHDRAWN"]
    credited = [_entry_to_out(e) for e in entries if e.side == "CREDITED"]

    prior_rows = (
        db.query(
            LoanEntry.side,
            LoanEntryAmount.account_name,
            func.coalesce(func.sum(LoanEntryAmount.amount), 0).label("total"),
        )
        .join(LoanEntryAmount, LoanEntryAmount.loan_entry_id == LoanEntry.id)
        .filter(LoanEntry.user_id == user.id, LoanEntry.fy_start_year < fy_start_year)
        .group_by(LoanEntry.side, LoanEntryAmount.account_name)
        .all()
    )
    prior: dict[str, LoanPriorOut] = {}
    for side, account_name, total in prior_rows:
        bucket = prior.setdefault(account_name, LoanPriorOut())
        if side == "WITHDRAWN":
            bucket.withdrawn = float(total)
        else:
            bucket.credited = float(total)

    return LoanFYDataOut(withdrawn=withdrawn, credited=credited, prior=prior)


def create_entry(user: User, fy_start_year: int, data: LoanEntryCreate, db: Session) -> LoanEntryOut:
    if data.side not in VALID_SIDES:
        raise HTTPException(status_code=400, detail=f"Invalid side: {data.side}")
    order = (
        db.query(LoanEntry)
        .filter_by(user_id=user.id, fy_start_year=fy_start_year, side=data.side)
        .count()
    )
    entry = LoanEntry(
        user_id=user.id,
        fy_start_year=fy_start_year,
        side=data.side,
        entry_date=data.entry_date,
        sort_order=order,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    db.refresh(entry, ["amounts"])
    return _entry_to_out(entry)


def _get_entry(user: User, entry_id: int, db: Session) -> LoanEntry:
    entry = db.query(LoanEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Loan entry not found")
    return entry


def update_entry(user: User, entry_id: int, data: LoanEntryUpdate, db: Session) -> LoanEntryOut:
    entry = _get_entry(user, entry_id, db)
    entry.entry_date = data.entry_date
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    db.refresh(entry, ["amounts"])
    return _entry_to_out(entry)


def delete_entry(user: User, entry_id: int, db: Session) -> None:
    entry = _get_entry(user, entry_id, db)
    db.delete(entry)
    db.commit()


def upsert_amount(
    user: User, entry_id: int, account_name: str, amount: Optional[Decimal], db: Session
) -> LoanEntryOut:
    entry = _get_entry(user, entry_id, db)
    row = (
        db.query(LoanEntryAmount)
        .filter_by(loan_entry_id=entry_id, account_name=account_name)
        .first()
    )
    if row is not None:
        if amount is None:
            db.delete(row)
        else:
            row.amount = amount
    elif amount is not None:
        db.add(LoanEntryAmount(loan_entry_id=entry_id, account_name=account_name, amount=amount))
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    db.refresh(entry, ["amounts"])
    return _entry_to_out(entry)


# ── Loans given ───────────────────────────────────────────────────────────────
def list_given(user: User, db: Session) -> List[LoanGiven]:
    return (
        db.query(LoanGiven)
        .filter_by(user_id=user.id)
        .order_by(LoanGiven.given_date.desc(), LoanGiven.id.desc())
        .all()
    )


def create_given(user: User, data: LoanGivenCreate, db: Session) -> LoanGiven:
    row = LoanGiven(user_id=user.id, **data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_given(user: User, given_id: int, data: LoanGivenUpdate, db: Session) -> LoanGiven:
    row = db.query(LoanGiven).filter_by(id=given_id, user_id=user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Loan-given entry not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_given(user: User, given_id: int, db: Session) -> None:
    row = db.query(LoanGiven).filter_by(id=given_id, user_id=user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Loan-given entry not found")
    db.delete(row)
    db.commit()
