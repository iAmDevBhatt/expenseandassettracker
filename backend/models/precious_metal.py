from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

METAL_TYPES = ["Gold", "Silver", "Gold Bar"]


class PreciousMetal(Base):
    __tablename__ = "precious_metals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    metal_type: Mapped[Optional[str]] = mapped_column(String(20))
    carat: Mapped[Optional[str]] = mapped_column(String(10))
    grams: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    purchase_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    amount_spent: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    current_value_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    user: Mapped["User"] = relationship("User", back_populates="precious_metals")
