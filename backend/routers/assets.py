from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.asset import AssetCreate, AssetUpdate, AssetOut
from services import asset_service

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=List[AssetOut])
def list_assets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return asset_service.list_assets(current_user, db)


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(
    data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return asset_service.create_asset(current_user, data, db)


@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    data: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return asset_service.update_asset(asset_id, data, current_user, db)


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset_service.delete_asset(asset_id, current_user, db)
