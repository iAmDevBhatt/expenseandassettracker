from datetime import datetime
from sqlalchemy import Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class MonthYear(Base):
    __tablename__ = "month_years"
    __table_args__ = (UniqueConstraint("user_id", "year", "month", name="uq_user_year_month"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="month_years")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="month_year", cascade="all, delete-orphan")
    cash_flow_entries: Mapped[list["CashFlowEntry"]] = relationship("CashFlowEntry", back_populates="month_year", cascade="all, delete-orphan")
