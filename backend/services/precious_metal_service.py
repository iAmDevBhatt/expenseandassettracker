from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.precious_metal import PreciousMetal
from models.user import User
from schemas.precious_metal import PreciousMetalCreate, PreciousMetalUpdate


def list_metals(user: User, db: Session) -> List[PreciousMetal]:
    return db.query(PreciousMetal).filter_by(user_id=user.id).order_by(PreciousMetal.id).all()


def create_metal(user: User, data: PreciousMetalCreate, db: Session) -> PreciousMetal:
    metal = PreciousMetal(user_id=user.id, **data.model_dump())
    db.add(metal)
    db.commit()
    db.refresh(metal)
    return metal


def get_metal(metal_id: int, user: User, db: Session) -> PreciousMetal:
    metal = db.query(PreciousMetal).filter_by(id=metal_id, user_id=user.id).first()
    if not metal:
        raise HTTPException(status_code=404, detail="Precious metal not found")
    return metal


def update_metal(metal_id: int, data: PreciousMetalUpdate, user: User, db: Session) -> PreciousMetal:
    metal = get_metal(metal_id, user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(metal, field, value)
    db.commit()
    db.refresh(metal)
    return metal


def delete_metal(metal_id: int, user: User, db: Session) -> None:
    metal = get_metal(metal_id, user, db)
    db.delete(metal)
    db.commit()


def fetch_metal_price(metal: str) -> Optional[float]:
    """
    Fetch live gold/silver price per gram in INR.
    Uses the free metals price API via exchangerate. Returns None on any failure.
    metal: 'gold' | 'silver' | 'gold_bar'
    """
    import httpx

    symbol_map = {"gold": "XAU", "silver": "XAG", "gold_bar": "XAU"}
    symbol = symbol_map.get(metal.lower())
    if not symbol:
        return None

    try:
        # Fetch USD price per troy oz from a free no-key API
        url = f"https://api.metals.live/v1/spot/{symbol.lower()}"
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(url)
        if resp.status_code != 200:
            return None
        data = resp.json()
        # metals.live returns [{"gold": price_usd}] or similar
        price_usd_per_oz = None
        if isinstance(data, list) and data:
            price_usd_per_oz = list(data[0].values())[0]
        elif isinstance(data, dict):
            price_usd_per_oz = data.get(symbol.lower()) or data.get("price")

        if price_usd_per_oz is None:
            return None

        # Convert USD/troy oz to INR/gram
        # 1 troy oz = 31.1035 grams
        # Fetch USD→INR rate
        fx_resp = httpx.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=5.0)
        inr_rate = 83.0  # fallback
        if fx_resp.status_code == 200:
            fx_data = fx_resp.json()
            inr_rate = fx_data.get("rates", {}).get("INR", 83.0)

        price_inr_per_gram = (float(price_usd_per_oz) * inr_rate) / 31.1035
        return round(price_inr_per_gram, 2)
    except Exception:
        return None
