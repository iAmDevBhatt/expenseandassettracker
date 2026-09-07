from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, DateTime, Date, Text, String, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class LoanSettings(Base):
    """One row per user. Holds the self-loan interest rate configured on the Config page."""
    __tablename__ = "loan_settings"
    __table_args__ = (UniqueConstraint("user_id", name="uq_loan_settings_user"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    personal_loan_interest_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="loan_settings")


class LoanAccountColumn(Base):
    """The loan-account columns shared by the Withdrawn and Credited ledger tables.

    Global per user (not per financial year) so an account's outstanding balance
    carries across years. `name` mirrors a LOAN_ACCOUNT config value but is stored
    as free text so config renames do not cascade.
    """
    __tablename__ = "loan_account_columns"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_loan_column_user_name"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="loan_account_columns")


class LoanEntry(Base):
    """A single dated row in either the Withdrawn or Credited table for one FY."""
    __tablename__ = "loan_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fy_start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    side: Mapped[str] = mapped_column(String(10), nullable=False)  # WITHDRAWN | CREDITED
    entry_date: Mapped[Optional[date]] = mapped_column(Date)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="loan_entries")
    amounts: Mapped[list["LoanEntryAmount"]] = relationship(
        "LoanEntryAmount", back_populates="entry", cascade="all, delete-orphan"
    )


class LoanEntryAmount(Base):
    """One amount cell = (loan entry row) x (loan account column)."""
    __tablename__ = "loan_entry_amounts"
    __table_args__ = (UniqueConstraint("loan_entry_id", "account_name", name="uq_loan_amount_entry_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    loan_entry_id: Mapped[int] = mapped_column(ForeignKey("loan_entries.id", ondelete="CASCADE"), nullable=False)
    account_name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    entry: Mapped["LoanEntry"] = relationship("LoanEntry", back_populates="amounts")


class LoanGiven(Base):
    """Money lent to other people — the 'bad debt' awareness tracker."""
    __tablename__ = "loans_given"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    given_date: Mapped[Optional[date]] = mapped_column(Date)
    person_name: Mapped[Optional[str]] = mapped_column(String(200))
    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    loan_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    cleared_date: Mapped[Optional[date]] = mapped_column(Date)
    paid_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="loans_given")
