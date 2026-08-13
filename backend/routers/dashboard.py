from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.dashboard import DashboardOut
from services import dashboard_service, month_service

router = APIRouter(tags=["dashboard"])


@router.get("/api/months/{month_year_id}/dashboard", response_model=DashboardOut)
def get_dashboard(
    month_year_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_year = month_service.get_month_by_id(month_year_id, current_user, db)
    return dashboard_service.get_dashboard(month_year, db)
