from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.loan import (
    LoanSettingsOut,
    LoanSettingsUpdate,
    LoanColumnOut,
    LoanColumnCreate,
    LoanFYDataOut,
    LoanEntryOut,
    LoanEntryCreate,
    LoanEntryUpdate,
    LoanAmountUpsert,
    LoanGivenOut,
    LoanGivenCreate,
    LoanGivenUpdate,
)
from services import loan_service

router = APIRouter(prefix="/api/loans", tags=["loans"])


# ── Settings ──────────────────────────────────────────────────────────────────
@router.get("/settings", response_model=LoanSettingsOut)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return loan_service.get_settings(current_user, db)


@router.put("/settings", response_model=LoanSettingsOut)
def update_settings(
    data: LoanSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.update_settings(current_user, data, db)


# ── Account columns ───────────────────────────────────────────────────────────
@router.get("/columns", response_model=List[LoanColumnOut])
def list_columns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return loan_service.list_columns(current_user, db)


@router.post("/columns", response_model=LoanColumnOut, status_code=201)
def add_column(
    data: LoanColumnCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.add_column(current_user, data, db)


@router.delete("/columns/{column_id}", status_code=204)
def delete_column(
    column_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan_service.delete_column(current_user, column_id, db)


# ── Loans given (bad debt) ────────────────────────────────────────────────────
@router.get("/given", response_model=List[LoanGivenOut])
def list_given(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return loan_service.list_given(current_user, db)


@router.post("/given", response_model=LoanGivenOut, status_code=201)
def create_given(
    data: LoanGivenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.create_given(current_user, data, db)


@router.put("/given/{given_id}", response_model=LoanGivenOut)
def update_given(
    given_id: int,
    data: LoanGivenUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.update_given(current_user, given_id, data, db)


@router.delete("/given/{given_id}", status_code=204)
def delete_given(
    given_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan_service.delete_given(current_user, given_id, db)


# ── Ledger entries — /entries/... registered before /{fy_start_year}/... ───────
@router.put("/entries/{entry_id}", response_model=LoanEntryOut)
def update_entry(
    entry_id: int,
    data: LoanEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.update_entry(current_user, entry_id, data, db)


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan_service.delete_entry(current_user, entry_id, db)


@router.put("/entries/{entry_id}/amounts/{account_name}", response_model=LoanEntryOut)
def upsert_amount(
    entry_id: int,
    account_name: str,
    data: LoanAmountUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.upsert_amount(current_user, entry_id, account_name, data.amount, db)


@router.get("/{fy_start_year}/data", response_model=LoanFYDataOut)
def get_fy_data(
    fy_start_year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.get_fy_data(current_user, fy_start_year, db)


@router.post("/{fy_start_year}/entries", response_model=LoanEntryOut, status_code=201)
def create_entry(
    fy_start_year: int,
    data: LoanEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return loan_service.create_entry(current_user, fy_start_year, data, db)
