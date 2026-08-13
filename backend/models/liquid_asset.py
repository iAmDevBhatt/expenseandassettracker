from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class LiquidAsset(Base):
    __tablename__ = "liquid_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    current_fixed: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    current_savings: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    current_cash: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    target_fixed: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    target_savings: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    target_cash: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    user: Mapped["User"] = relationship("User", back_populates="liquid_asset")
