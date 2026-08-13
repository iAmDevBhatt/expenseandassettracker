from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.config_item import ConfigItemCreate, ConfigItemUpdate, ConfigItemOut
from services import config_service

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=Dict[str, List[ConfigItemOut]])
def get_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return config_service.get_all(db)


@router.get("/{list_type}", response_model=List[ConfigItemOut])
def get_by_type(
    list_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return config_service.get_by_list_type(list_type, db)


@router.post("/{list_type}", response_model=ConfigItemOut, status_code=201)
def add_item(
    list_type: str,
    data: ConfigItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return config_service.add_item(list_type, data, db)


@router.put("/{list_type}/{item_id}", response_model=ConfigItemOut)
def update_item(
    list_type: str,
    item_id: int,
    data: ConfigItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return config_service.update_item(list_type, item_id, data, db)


@router.delete("/{list_type}/{item_id}", status_code=204)
def delete_item(
    list_type: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config_service.delete_item(list_type, item_id, db)
