from typing import Optional
from sqlalchemy.orm import Session

from models.liquid_asset import LiquidAsset
from models.user import User
from schemas.liquid_asset import LiquidAssetUpdate


def find(user: User, db: Session) -> Optional[LiquidAsset]:
    """Returns existing row or None. Never creates."""
    return db.query(LiquidAsset).filter_by(user_id=user.id).first()


def create(user: User, db: Session) -> LiquidAsset:
    """Explicitly create the single row. Idempotent — returns existing row if already present."""
    row = db.query(LiquidAsset).filter_by(user_id=user.id).first()
    if not row:
        row = LiquidAsset(user_id=user.id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_or_create(user: User, db: Session) -> LiquidAsset:
    """Legacy — kept for compatibility. Use create() for explicit creation."""
    return create(user, db)


def update(data: LiquidAssetUpdate, user: User, db: Session) -> LiquidAsset:
    row = get_or_create(user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row
