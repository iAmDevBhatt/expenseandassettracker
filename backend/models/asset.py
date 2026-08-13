from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, DateTime, Date, Text, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_category: Mapped[Optional[str]] = mapped_column(String(100))
    asset_holder: Mapped[Optional[str]] = mapped_column(String(100))
    asset_sub_category: Mapped[Optional[str]] = mapped_column(String(100))
    account_number: Mapped[Optional[str]] = mapped_column(String(50))
    name: Mapped[Optional[str]] = mapped_column(String(200))
    current_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    as_of_date: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="assets")
    monthly_values: Mapped[list["AssetMonthlyValue"]] = relationship(
        "AssetMonthlyValue", back_populates="asset", cascade="all, delete-orphan"
    )
