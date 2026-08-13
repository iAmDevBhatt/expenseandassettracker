# Expense & Asset Tracker

A personal finance tracker for recording monthly expenses, operating cash flow, and assets across financial years. All amounts in INR (₹).

## Quick Start

```powershell
.\start.ps1   # starts backend (port 8000) + frontend (port 5173)
.\stop.ps1    # stops both
```

Login: `admin` / `admin123`

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+ · FastAPI · SQLAlchemy · SQLite |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| Auth | JWT (python-jose) · BCrypt (passlib) |
| State | Zustand (auth/config) · TanStack Query (server state) |

## Features

- **Expenses** — record monthly expenses by category; credit card tracking; navigate any month across 60+ years via ‹/› arrows or jump pickers; months are only created in the DB when explicitly started
- **Cash Flow** — 24-row operating cash flow table per month (22 editable + 2 computed)
- **Financial Summary** — income vs. spending vs. investment vs. open balance
- **Assets** — multi-year FY grid (Apr–Mar) with monthly values per asset; navigate between financial years via URL (`/assets/2025`, `/assets/2026`, …)
- **Asset Summary** — auto-computed totals grouped by sub-category
- **Protection & Savings Targets** — Emergency Funds, Term Insurance, Gold, Silver; only created when user explicitly clicks "Set up"
- **Liquid Assets** — current/target Fixed, Savings, Cash; only created when user explicitly clicks "Set up"
- **Precious Metals** — live gold/silver prices (INR/gram) with manual override
- **User Management** — add/edit/delete users at `/users`
- **Configuration** — runtime-editable dropdown lists at `/config`
- **Labels** — all UI text in `frontend/public/labels.properties` (edit and reload to change)

## Project Structure

```
expenseandassettracker/
├── backend/
│   ├── main.py              FastAPI app + router registration
│   ├── database.py          SQLAlchemy engine + session
│   ├── seed.py              Admin user + config defaults
│   ├── migrate_monthly_year.py  One-time DB migration (adds fy_start_year)
│   ├── models/              SQLAlchemy ORM models
│   ├── schemas/             Pydantic request/response models
│   ├── routers/             FastAPI route handlers
│   ├── services/            Business logic
│   └── core/                Config, security, cash flow row definitions
├── frontend/
│   ├── public/
│   │   └── labels.properties  All UI label text (runtime-configurable)
│   └── src/
│       ├── api/             Axios API functions
│       ├── components/      Reusable UI components
│       ├── pages/           Page-level components
│       ├── store/           Zustand stores (auth, config)
│       ├── hooks/           useLabels, etc.
│       ├── utils/           financialYear.ts helpers
│       └── types/           TypeScript interfaces
├── start.ps1
├── stop.ps1
├── AI_GUIDE.md              Full API + DB reference for AI/developers
└── README.md
```

## Financial Year

FY runs April → March. `fy_start_year = 2025` means FY 2025-26 (Apr 2025 – Mar 2026).  
The asset page URL encodes the year: `/assets/2025` for FY 2025-26.

## Database

Default: `backend/data/tracker.db` (SQLite).  
Switch to PostgreSQL: set `DATABASE_URL=postgresql://user:pass@host/db` before starting the backend.

See `AI_GUIDE.md` for the full table catalog, API reference, and computed field rules.
