from typing import List, Optional
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from models.asset import Asset
from models.asset_monthly_value import AssetMonthlyValue
from models.user import User
from schemas.asset import AssetCreate, AssetUpdate, AssetMonthlyValueOut

VALID_MONTH_KEYS = {"APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"}


def list_assets(user: User, db: Session) -> List[Asset]:
    return (
        db.query(Asset)
        .options(selectinload(Asset.monthly_values))
        .filter_by(user_id=user.id)
        .order_by(Asset.asset_category.asc(), Asset.id.asc())
        .all()
    )


def create_asset(user: User, data: AssetCreate, db: Session) -> Asset:
    asset = Asset(user_id=user.id, **data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    db.refresh(asset, ["monthly_values"])
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
    db.refresh(asset, ["monthly_values"])
    return asset


def delete_asset(asset_id: int, user: User, db: Session) -> None:
    asset = get_asset(asset_id, user, db)
    db.delete(asset)
    db.commit()


def upsert_monthly_value(
    asset_id: int, month_key: str, fy_start_year: int, amount: Optional[Decimal], user: User, db: Session
) -> AssetMonthlyValue:
    if month_key not in VALID_MONTH_KEYS:
        raise HTTPException(status_code=400, detail=f"Invalid month_key: {month_key}")
    get_asset(asset_id, user, db)  # ownership check
    existing = db.query(AssetMonthlyValue).filter_by(
        asset_id=asset_id, month_key=month_key, fy_start_year=fy_start_year
    ).first()
    if existing:
        existing.amount = amount
    else:
        existing = AssetMonthlyValue(
            asset_id=asset_id, month_key=month_key, fy_start_year=fy_start_year, amount=amount
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def delete_monthly_value(asset_id: int, month_key: str, fy_start_year: int, user: User, db: Session) -> None:
    get_asset(asset_id, user, db)  # ownership check
    row = db.query(AssetMonthlyValue).filter_by(
        asset_id=asset_id, month_key=month_key, fy_start_year=fy_start_year
    ).first()
    if row:
        db.delete(row)
        db.commit()
