from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.asset import Asset
from models.user import User
from schemas.asset import AssetCreate, AssetUpdate


def list_assets(user: User, db: Session) -> List[Asset]:
    return (
        db.query(Asset)
        .filter_by(user_id=user.id)
        .order_by(Asset.asset_category.asc(), Asset.name.asc())
        .all()
    )


def create_asset(user: User, data: AssetCreate, db: Session) -> Asset:
    asset = Asset(user_id=user.id, **data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def get_asset(asset_id: int, user: User, db: Session) -> Asset:
    asset = db.query(Asset).filter_by(id=asset_id, user_id=user.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


def update_asset(asset_id: int, data: AssetUpdate, user: User, db: Session) -> Asset:
    asset = get_asset(asset_id, user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(asset_id: int, user: User, db: Session) -> None:
    asset = get_asset(asset_id, user, db)
    db.delete(asset)
    db.commit()
