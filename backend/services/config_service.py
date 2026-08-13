from typing import List, Dict
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.config_item import ConfigItem
from schemas.config_item import ConfigItemCreate, ConfigItemUpdate, ConfigItemOut

VALID_LIST_TYPES = {
    "EXPENSE_CATEGORY",
    "CREDIT_CARD",
    "MONTHLY_MUST",
    "TOTALLY_ESSENTIAL",
    "ASSET_CATEGORY",
    "ASSET_HOLDER",
    "ASSET_SUB_CATEGORY",
    "IGNORE_CATEGORY",
}


def _validate_list_type(list_type: str) -> None:
    if list_type not in VALID_LIST_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid list_type: {list_type}")


def get_by_list_type(list_type: str, db: Session) -> List[ConfigItem]:
    _validate_list_type(list_type)
    return (
        db.query(ConfigItem)
        .filter_by(list_type=list_type, is_active=True)
        .order_by(ConfigItem.sort_order.asc(), ConfigItem.value.asc())
        .all()
    )


def get_all(db: Session) -> Dict[str, List[ConfigItemOut]]:
    items = (
        db.query(ConfigItem)
        .filter_by(is_active=True)
        .order_by(ConfigItem.list_type.asc(), ConfigItem.sort_order.asc())
        .all()
    )
    result: Dict[str, List[ConfigItemOut]] = {lt: [] for lt in VALID_LIST_TYPES}
    for item in items:
        out = ConfigItemOut.model_validate(item)
        result.setdefault(item.list_type, []).append(out)
    return result


def add_item(list_type: str, data: ConfigItemCreate, db: Session) -> ConfigItem:
    _validate_list_type(list_type)
    existing = db.query(ConfigItem).filter_by(list_type=list_type, value=data.value).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=409, detail=f"'{data.value}' already exists in {list_type}")

    max_order = db.query(ConfigItem).filter_by(list_type=list_type).count()
    item = ConfigItem(list_type=list_type, value=data.value, sort_order=max_order)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(list_type: str, item_id: int, data: ConfigItemUpdate, db: Session) -> ConfigItem:
    _validate_list_type(list_type)
    item = db.query(ConfigItem).filter_by(id=item_id, list_type=list_type).first()
    if not item:
        raise HTTPException(status_code=404, detail="Config item not found")
    item.value = data.value
    item.sort_order = data.sort_order
    db.commit()
    db.refresh(item)
    return item


def delete_item(list_type: str, item_id: int, db: Session) -> None:
    _validate_list_type(list_type)
    item = db.query(ConfigItem).filter_by(id=item_id, list_type=list_type).first()
    if not item:
        raise HTTPException(status_code=404, detail="Config item not found")
    item.is_active = False
    db.commit()


def get_values_by_list_type(list_type: str, db: Session) -> List[str]:
    return [item.value for item in get_by_list_type(list_type, db)]
