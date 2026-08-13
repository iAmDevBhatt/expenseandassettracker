from datetime import datetime
from pydantic import BaseModel


class ConfigItemCreate(BaseModel):
    value: str


class ConfigItemUpdate(BaseModel):
    value: str
    sort_order: int = 0


class ConfigItemOut(BaseModel):
    id: int
    list_type: str
    value: str
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
