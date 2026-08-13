from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class CashFlowEntry(Base):
    __tablename__ = "cash_flow_entries"
    __table_args__ = (UniqueConstraint("month_year_id", "row_key", name="uq_month_row_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    month_year_id: Mapped[int] = mapped_column(ForeignKey("month_years.id", ondelete="CASCADE"), nullable=False)
    row_key: Mapped[str] = mapped_column(String(80), nullable=False)
    manual_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=Decimal("0"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    month_year: Mapped["MonthYear"] = relationship("MonthYear", back_populates="cash_flow_entries")
