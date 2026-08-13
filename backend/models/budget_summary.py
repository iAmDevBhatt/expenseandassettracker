from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, DateTime, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class BudgetSummary(Base):
    __tablename__ = "budget_summaries"
    __table_args__ = (
        UniqueConstraint("user_id", "fy_start_year", name="uq_budget_summary_user_fy"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fy_start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_income: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    projected_loss_tax: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    projected_target_saving: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    targeted_saving: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    actual_loss_tax: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="budget_summaries")
