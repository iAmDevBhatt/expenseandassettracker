from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

PROTECTION_CATEGORIES = ["Emergency Funds", "Term Insurance", "Gold", "Silver"]


class ProtectionTarget(Base):
    __tablename__ = "protection_targets"
    __table_args__ = (UniqueConstraint("user_id", "category"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    current_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    target_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    user: Mapped["User"] = relationship("User", back_populates="protection_targets")
