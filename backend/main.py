from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import engine, Base
import models  # ensure all models are registered with Base

from routers import auth, months, expenses, cash_flow, config_items, dashboard, assets, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Personal expense and asset tracker API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(expenses.router)
app.include_router(cash_flow.router)
app.include_router(dashboard.router)
app.include_router(config_items.router)
app.include_router(assets.router)
app.include_router(months.router)  # last: its /{year}/{month} wildcard must not shadow the above


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
