from datetime import datetime
from decimal import Decimal
from sqlalchemy import Numeric, ForeignKey, DateTime, String, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class BudgetEntry(Base):
    __tablename__ = "budget_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "fy_start_year", "category", name="uq_budget_user_fy_category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fy_start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(200), nullable=False)
    amount_per_month: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    qty: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="budget_entries")
