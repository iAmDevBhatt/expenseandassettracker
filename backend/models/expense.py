from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, DateTime, Date, Text, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    month_year_id: Mapped[int] = mapped_column(ForeignKey("month_years.id", ondelete="CASCADE"), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    amount_cc: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    paid_via_cc: Mapped[Optional[str]] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    month_year: Mapped["MonthYear"] = relationship("MonthYear", back_populates="expenses")
