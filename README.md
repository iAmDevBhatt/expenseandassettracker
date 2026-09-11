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
| Backend | Python 3.11+ (tested up to 3.14) · FastAPI · SQLAlchemy · SQLite |
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
- **Loans** — self-loan tracker at `/loans`; multi-year FY ledger of money **Withdrawn** from your own savings accounts vs. **Credited** back, with shared add/remove account columns and horizontal scroll; unpaid balances roll forward as an "Opening (carried forward)" row each FY; summary of current loan per account plus the monthly interest you charge yourself (`Personal Loan Interest %` set in Configuration); separate "Loans Given to Others" bad-debt watch with outstanding totals
- **Budget** — yearly budget planner at `/budget`; set per-category Amount/Month × Qty to project expenditure; compare Projected vs Actual with colour-coded progress bars; configurable date range; budget summary with income, tax, and saving targets
- **Graphs** — interactive analytics at `/graphs`; stacked bar (monthly spend by category), donut (category breakdown), line chart (income vs spending vs investment), grouped bar (projected vs actual by category), area chart (asset value growth)
- **User Management** — add/edit/delete users at `/users`
- **Configuration** — runtime-editable dropdown lists + settings at `/config`; a compact index of categories, each opening a Save/Cancel editor modal
- **Labels** — all UI text in `frontend/public/labels.properties` (edit and reload to change)

## Project Structure

```
expenseandassettracker/
├── backend/
│   ├── main.py              FastAPI app + router registration
│   ├── database.py          SQLAlchemy engine + session
│   ├── seed.py              Admin user + config defaults (idempotent)
│   ├── migrate.py           Idempotent, non-destructive schema migrations (runs before seed.py)
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
├── Dockerfile               Multi-stage Docker build (frontend → FastAPI static serving)
├── docker-compose.yml       For production deployment (see Docker Deployment below)
├── AI_GUIDE.md              Full API + DB reference for AI/developers
└── README.md
```

## Financial Year

FY runs April → March. `fy_start_year = 2025` means FY 2025-26 (Apr 2025 – Mar 2026).  
The asset and loan page URLs encode the year: `/assets/2025` / `/loans/2025` for FY 2025-26.

## Database

Default: `backend/data/tracker.db` (SQLite).  
Switch to PostgreSQL: set `DATABASE_URL=postgresql://user:pass@host/db` before starting the backend.  
PostgreSQL also requires `psycopg2-binary` (not installed by default — see `requirements.txt` comment).

See `AI_GUIDE.md` for the full table catalog, API reference, and computed field rules.

## Fixing a Accidentally Committed `.venv`

If the `backend/.venv` folder was ever committed to git (e.g. from a machine where `.gitignore` wasn't respected), follow these steps to remove it from tracking without deleting the local files.

**1. Check if `.venv` is tracked:**
```powershell
git ls-files backend/.venv
```
If this lists files, the venv is tracked and needs to be removed.

**2. Remove it from git tracking (keeps local files intact):**
```powershell
git rm -r --cached backend/.venv
```
This stages deletions for all `.venv` files without touching your actual venv on disk.

**3. Verify the staged changes look correct:**
```powershell
git status --short | Select-Object -First 10
```
You should see a large number of `D` (deleted) entries all under `backend/.venv/`.

**4. Commit the cleanup:**
```powershell
git commit -m "Remove backend/.venv from git tracking"
```

After this, `.gitignore` (which already includes `.venv/`) will prevent it from being committed again. Your local venv and the running backend are unaffected.

> **Why this happens:** If `.venv` was created and `git add`-ed before `.gitignore` was in place, git continues tracking it even after the ignore rule is added. `git rm --cached` is the fix — it tells git to stop tracking the files without removing them from disk.

**After pulling this cleanup on another machine**, git will delete the local `.venv` folder as part of the pull. Recreate it with:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

Then `.\start.ps1` works as normal. This is a one-time step — after that, the venv is fully local and git never touches it again.

---

## Docker Deployment

The project ships with a multi-stage `Dockerfile` that builds the React frontend and serves it via FastAPI in a single container.

### Quick test (single container)

```bash
docker build -t expenseandassettracker .
docker run -p 8000:8000 -v tracker_data:/app/data expenseandassettracker
```

Open `http://localhost:8000` — the full app is served from one port.

### Production (docker-compose)

The `docker-compose.yml` in the repo is designed to be used from the **parent directory** of the git clone. For example, if the project lives at `/opt/blr-stack/expenseandassettracker/`:

```bash
# Copy docker-compose.yml one level up
cp docker-compose.yml /opt/blr-stack/docker-compose.yml

# Then from /opt/blr-stack/
docker-compose up -d
```

The build context in `docker-compose.yml` is set to `./expenseandassettracker`, which resolves correctly when the file is in the parent directory. Edit `JWT_SECRET` in the compose file before deploying to production.
