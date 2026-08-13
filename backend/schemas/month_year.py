from datetime import datetime
from pydantic import BaseModel


class MonthYearOut(BaseModel):
    id: int
    year: int
    month: int
    created_at: datetime

    model_config = {"from_attributes": True}
