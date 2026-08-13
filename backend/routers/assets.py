from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.asset import AssetCreate, AssetUpdate, AssetOut, AssetMonthlyValueOut, AssetMonthlyValueUpsert
from schemas.protection_target import ProtectionTargetOut, ProtectionTargetUpdate
from schemas.liquid_asset import LiquidAssetOut, LiquidAssetUpdate
from schemas.precious_metal import PreciousMetalCreate, PreciousMetalUpdate, PreciousMetalOut, MetalPriceOut
from services import asset_service, protection_target_service, liquid_asset_service, precious_metal_service

router = APIRouter(prefix="/api/assets", tags=["assets"])

# ── Static routes FIRST (must precede /{asset_id} to avoid shadowing) ──────────

# Protection Targets
@router.get("/protection-targets", response_model=List[ProtectionTargetOut])
def list_protection_targets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns existing rows. Empty list if not yet set up — never auto-seeds."""
    return protection_target_service.find(current_user, db)


@router.post("/protection-targets/init", response_model=List[ProtectionTargetOut], status_code=201)
def init_protection_targets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Explicitly seed the 4 fixed rows. Idempotent."""
    return protection_target_service.seed(current_user, db)


@router.put("/protection-targets/{target_id}", response_model=ProtectionTargetOut)
def update_protection_target(
    target_id: int,
    data: ProtectionTargetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return protection_target_service.update(target_id, data, current_user, db)


# Liquid Asset
@router.get("/liquid-asset", response_model=Optional[LiquidAssetOut])
def get_liquid_asset(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns existing row or null — never auto-creates."""
    row = liquid_asset_service.find(current_user, db)
    if row is None:
        raise HTTPException(status_code=404, detail="Liquid asset not set up")
    return row


@router.post("/liquid-asset/init", response_model=LiquidAssetOut, status_code=201)
def init_liquid_asset(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Explicitly create the liquid asset row. Idempotent."""
    return liquid_asset_service.create(current_user, db)


@router.put("/liquid-asset", response_model=LiquidAssetOut)
def update_liquid_asset(
    data: LiquidAssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return liquid_asset_service.update(data, current_user, db)


# Precious Metals
@router.get("/precious-metals", response_model=List[PreciousMetalOut])
def list_precious_metals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return precious_metal_service.list_metals(current_user, db)


@router.post("/precious-metals", response_model=PreciousMetalOut, status_code=201)
def create_precious_metal(
    data: PreciousMetalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return precious_metal_service.create_metal(current_user, data, db)


@router.put("/precious-metals/{metal_id}", response_model=PreciousMetalOut)
def update_precious_metal(
    metal_id: int,
    data: PreciousMetalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return precious_metal_service.update_metal(metal_id, data, current_user, db)


@router.delete("/precious-metals/{metal_id}", status_code=204)
def delete_precious_metal(
    metal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    precious_metal_service.delete_metal(metal_id, current_user, db)


@router.get("/metal-price/{metal}", response_model=MetalPriceOut)
def get_metal_price(
    metal: str,
    current_user: User = Depends(get_current_user),
):
    price = precious_metal_service.fetch_metal_price(metal)
    return MetalPriceOut(price_per_gram=price)


# ── Asset CRUD ──────────────────────────────────────────────────────────────────

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


# ── Monthly Values ──────────────────────────────────────────────────────────────

@router.put("/{asset_id}/monthly/{fy_start_year}/{month_key}", response_model=AssetMonthlyValueOut)
def upsert_monthly_value(
    asset_id: int,
    fy_start_year: int,
    month_key: str,
    data: AssetMonthlyValueUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return asset_service.upsert_monthly_value(
        asset_id, month_key.upper(), fy_start_year, data.amount, current_user, db
    )


@router.delete("/{asset_id}/monthly/{fy_start_year}/{month_key}", status_code=204)
def delete_monthly_value(
    asset_id: int,
    fy_start_year: int,
    month_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset_service.delete_monthly_value(asset_id, month_key.upper(), fy_start_year, current_user, db)
