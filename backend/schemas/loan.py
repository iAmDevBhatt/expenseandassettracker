from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict
from pydantic import BaseModel


# ── Settings ──────────────────────────────────────────────────────────────────
class LoanSettingsOut(BaseModel):
    personal_loan_interest_pct: Optional[float] = None

    model_config = {"from_attributes": True}


class LoanSettingsUpdate(BaseModel):
    personal_loan_interest_pct: Optional[Decimal] = None


# ── Account columns ───────────────────────────────────────────────────────────
class LoanColumnOut(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class LoanColumnCreate(BaseModel):
    name: str


# ── Ledger entries (Withdrawn / Credited) ─────────────────────────────────────
class LoanEntryOut(BaseModel):
    id: int
    side: str
    entry_date: Optional[date]
    amounts: Dict[str, Optional[float]] = {}


class LoanPriorOut(BaseModel):
    withdrawn: float = 0.0
    credited: float = 0.0


class LoanFYDataOut(BaseModel):
    withdrawn: List[LoanEntryOut] = []
    credited: List[LoanEntryOut] = []
    prior: Dict[str, LoanPriorOut] = {}


class LoanEntryCreate(BaseModel):
    side: str  # WITHDRAWN | CREDITED
    entry_date: Optional[date] = None


class LoanEntryUpdate(BaseModel):
    entry_date: Optional[date] = None


class LoanAmountUpsert(BaseModel):
    amount: Optional[Decimal] = None


# ── Loans given (bad debt tracker) ────────────────────────────────────────────
class LoanGivenBase(BaseModel):
    given_date: Optional[date] = None
    person_name: Optional[str] = None
    payment_method: Optional[str] = None
    loan_amount: Optional[Decimal] = None
    cleared_date: Optional[date] = None
    paid_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class LoanGivenCreate(LoanGivenBase):
    pass


class LoanGivenUpdate(LoanGivenBase):
    pass


class LoanGivenOut(BaseModel):
    id: int
    given_date: Optional[date]
    person_name: Optional[str]
    payment_method: Optional[str]
    loan_amount: Optional[float]
    cleared_date: Optional[date]
    paid_amount: Optional[float]
    notes: Optional[str]

    model_config = {"from_attributes": True}
