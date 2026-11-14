from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.asset_blueprint import AssetBlueprint
from models.user import User
from schemas.asset_blueprint import AssetBlueprintCreate, AssetBlueprintUpdate


def list_blueprints(user: User, db: Session) -> List[AssetBlueprint]:
    return (
        db.query(AssetBlueprint)
        .filter_by(user_id=user.id)
        .order_by(AssetBlueprint.sort_order.asc(), AssetBlueprint.id.asc())
        .all()
    )


def create_blueprint(user: User, data: AssetBlueprintCreate, db: Session) -> AssetBlueprint:
    payload = data.model_dump()
    if payload.get("sort_order") is None:
        count = db.query(AssetBlueprint).filter_by(user_id=user.id).count()
        payload["sort_order"] = count
    blueprint = AssetBlueprint(user_id=user.id, **payload)
    db.add(blueprint)
    db.commit()
    db.refresh(blueprint)
    return blueprint


def get_blueprint(blueprint_id: int, user: User, db: Session) -> AssetBlueprint:
    blueprint = db.query(AssetBlueprint).filter_by(id=blueprint_id, user_id=user.id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Asset blueprint not found")
    return blueprint


def update_blueprint(blueprint_id: int, data: AssetBlueprintUpdate, user: User, db: Session) -> AssetBlueprint:
    blueprint = get_blueprint(blueprint_id, user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(blueprint, field, value)
    db.commit()
    db.refresh(blueprint)
    return blueprint


def delete_blueprint(blueprint_id: int, user: User, db: Session) -> None:
    blueprint = get_blueprint(blueprint_id, user, db)
    db.delete(blueprint)
    db.commit()
