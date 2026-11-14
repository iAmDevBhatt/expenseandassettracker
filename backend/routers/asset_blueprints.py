from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.asset_blueprint import AssetBlueprintCreate, AssetBlueprintUpdate, AssetBlueprintOut
from services import asset_blueprint_service

router = APIRouter(prefix="/api/asset-blueprints", tags=["asset-blueprints"])


@router.get("", response_model=List[AssetBlueprintOut])
def list_asset_blueprints(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return asset_blueprint_service.list_blueprints(current_user, db)


@router.post("", response_model=AssetBlueprintOut, status_code=201)
def create_asset_blueprint(
    data: AssetBlueprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return asset_blueprint_service.create_blueprint(current_user, data, db)


@router.put("/{blueprint_id}", response_model=AssetBlueprintOut)
def update_asset_blueprint(
    blueprint_id: int,
    data: AssetBlueprintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return asset_blueprint_service.update_blueprint(blueprint_id, data, current_user, db)


@router.delete("/{blueprint_id}", status_code=204)
def delete_asset_blueprint(
    blueprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset_blueprint_service.delete_blueprint(blueprint_id, current_user, db)
