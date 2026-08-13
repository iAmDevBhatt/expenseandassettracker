from decimal import Decimal
from typing import Optional
from sqlalchemy import Integer, Numeric, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class AssetMonthlyValue(Base):
    __tablename__ = "asset_monthly_values"
    __table_args__ = (UniqueConstraint("asset_id", "month_key", "fy_start_year"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    month_key: Mapped[str] = mapped_column(String(3), nullable=False)
    fy_start_year: Mapped[int] = mapped_column(Integer, nullable=False, default=2025)
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    asset: Mapped["Asset"] = relationship("Asset", back_populates="monthly_values")
