from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import engine, Base
import models  # ensure all models are registered with Base

from routers import auth, months, expenses, cash_flow, config_items, dashboard, assets, users, budget

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
app.include_router(budget.router)
app.include_router(months.router)  # last: its /{year}/{month} wildcard must not shadow the above


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


# Docker mode: serve the built React SPA as static files.
# Activated by setting SERVE_STATIC=true in the container environment.
# Must come after all API routers so the catch-all does not shadow /api/ routes.
import os
if os.getenv("SERVE_STATIC", "false").lower() == "true":
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse as _FileResponse

    _static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    _assets_dir = os.path.join(_static_dir, "assets")

    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="vite-assets")

    @app.get("/labels.properties", include_in_schema=False)
    def serve_labels():
        return _FileResponse(os.path.join(_static_dir, "labels.properties"), media_type="text/plain")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return _FileResponse(os.path.join(_static_dir, "index.html"))
