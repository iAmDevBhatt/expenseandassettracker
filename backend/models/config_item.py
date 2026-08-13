from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class ConfigItem(Base):
    __tablename__ = "config_items"
    __table_args__ = (UniqueConstraint("list_type", "value", name="uq_list_type_value"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    list_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
