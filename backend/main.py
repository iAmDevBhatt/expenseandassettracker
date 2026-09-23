from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import engine, Base
import models  # ensure all models are registered with Base

from routers import auth, months, expenses, cash_flow, config_items, dashboard, assets, users, budget, loans

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
app.include_router(loans.router)
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
    _icons_dir = os.path.join(_static_dir, "icons")

    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="vite-assets")

    if os.path.isdir(_icons_dir):
        app.mount("/icons", StaticFiles(directory=_icons_dir), name="vite-icons")

    @app.get("/labels.properties", include_in_schema=False)
    def serve_labels():
        return _FileResponse(os.path.join(_static_dir, "labels.properties"), media_type="text/plain")

    @app.get("/favicon.ico", include_in_schema=False)
    def serve_favicon():
        # favicon.ico was replaced by the PNG icons; redirect old requests there
        return _FileResponse(os.path.join(_static_dir, "icons", "icon-192.png"), media_type="image/png")

    _static_root = os.path.realpath(_static_dir)
    # PWA files emitted at the dist root by vite-plugin-pwa. The service worker and its
    # registration script must never be cached, or clients get stuck on an old build.
    _no_cache_files = {"sw.js", "registerSW.js", "manifest.webmanifest"}
    _media_types = {".webmanifest": "application/manifest+json", ".js": "application/javascript"}

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Serve real top-level build files (sw.js, manifest.webmanifest, workbox-*.js, …);
        # everything else is a client-side route and gets index.html.
        candidate = os.path.realpath(os.path.join(_static_root, full_path))
        if full_path and candidate.startswith(_static_root + os.sep) and os.path.isfile(candidate):
            name = os.path.basename(candidate)
            headers = {"Cache-Control": "no-cache"} if name in _no_cache_files else None
            return _FileResponse(
                candidate,
                media_type=_media_types.get(os.path.splitext(name)[1]),
                headers=headers,
            )
        return _FileResponse(os.path.join(_static_dir, "index.html"), headers={"Cache-Control": "no-cache"})
