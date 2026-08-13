from typing import List
from sqlalchemy.orm import Session

from models.protection_target import ProtectionTarget, PROTECTION_CATEGORIES
from models.user import User
from schemas.protection_target import ProtectionTargetUpdate


def find(user: User, db: Session) -> List[ProtectionTarget]:
    """Returns existing rows. Never creates. Returns empty list if not yet set up."""
    return db.query(ProtectionTarget).filter_by(user_id=user.id).order_by(ProtectionTarget.id).all()


def seed(user: User, db: Session) -> List[ProtectionTarget]:
    """Explicitly seed the 4 rows. Safe to call multiple times (idempotent)."""
    existing_cats = {r.category for r in db.query(ProtectionTarget).filter_by(user_id=user.id).all()}
    for cat in PROTECTION_CATEGORIES:
        if cat not in existing_cats:
            db.add(ProtectionTarget(user_id=user.id, category=cat))
    db.commit()
    return db.query(ProtectionTarget).filter_by(user_id=user.id).order_by(ProtectionTarget.id).all()


def get_or_seed(user: User, db: Session) -> List[ProtectionTarget]:
    """Legacy — kept for compatibility. Use seed() for explicit creation."""
    return seed(user, db)


def update(target_id: int, data: ProtectionTargetUpdate, user: User, db: Session) -> ProtectionTarget:
    row = db.query(ProtectionTarget).filter_by(id=target_id, user_id=user.id).first()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Protection target not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row
