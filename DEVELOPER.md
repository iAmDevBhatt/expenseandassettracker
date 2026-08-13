# Developer Guide — Expense & Asset Tracker

This document explains every source file, how to run the project locally, and how to extend it.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (React PWA)                        │
│  • Zustand (auth/config state)              │
│  • TanStack Query (server state + cache)    │
│  • Axios (HTTP with JWT interceptor)        │
└───────────────────┬─────────────────────────┘
                    │ HTTP/JSON
┌───────────────────▼─────────────────────────┐
│  FastAPI Backend (Python)                   │
│  • Pydantic schemas (validation)            │
│  • Services (business logic)                │
│  • SQLAlchemy ORM                           │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  SQLite (default)  /  PostgreSQL (optional) │
└─────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 9+ |

---

## UI Labels (labels.properties)

All user-visible text in the app is driven by a single properties file:

```
frontend/public/labels.properties
```

- Edit any value to the right of the `=` sign and reload the browser — no rebuild needed.
- Keys must not be renamed or deleted; only values should change.
- The file is fetched at runtime via `GET /labels.properties` and parsed by `src/hooks/useLabels.ts`.
- The `useLabels` hook exposes an `l(key)` helper used in every component.
- Labels are cached in memory after the first load; a hard refresh (Ctrl+Shift+R) picks up changes.

---

## Running Locally

### Quick start (Windows)

```powershell
.\start.ps1   # starts backend + frontend in two new terminal windows
.\stop.ps1    # stops both (kills ports 8000 and 5173)
```

### Manual start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Seed database (first time only)
python seed.py

# Start the server
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

App available at: `http://localhost:5173`

### Default credentials
- Username: `admin`
- Password: `admin123`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/tracker.db` | SQLAlchemy connection string |
| `JWT_SECRET` | (hardcoded default) | JWT signing secret — **change in production** |
| `JWT_EXPIRY_HOURS` | `24` | Token lifetime |
| `DEBUG` | `false` | Enable SQL echo |

Set in `backend/.env` file or as OS environment variables.

**Switch to PostgreSQL:**
```bash
export DATABASE_URL=postgresql://user:pass@localhost/trackerdb
```

---

## Backend File Map

### `main.py`
FastAPI app entry point. Creates DB tables on startup, registers all routers, configures CORS.

### `database.py`
SQLAlchemy engine + `SessionLocal` factory + `Base` declarative class.
Reads `DATABASE_URL` from settings. Passes `check_same_thread=False` for SQLite.

### `core/config.py`
Pydantic `Settings` class. Reads `.env` file. Single source of truth for all configuration values.

### `core/security.py`
Password hashing (`passlib/bcrypt`) and JWT generation/decoding (`python-jose`).
Functions: `hash_password`, `verify_password`, `create_access_token`, `decode_token`.

### `core/cash_flow_rows.py`
The canonical definition of all 25 Operating Cash Flow rows.
`CASH_FLOW_ROWS` dict maps `row_key → CashFlowRowDef(sort_order, label, computed)`.
`INCOME_ROW_KEYS` lists which rows contribute to "income" in the financial summary.
**Extend here** to add new cash flow rows — no DB migration needed.

### `models/`
SQLAlchemy ORM models. One file per entity:
- `user.py` — `User` (auth)
- `month_year.py` — `MonthYear` (per-month data container)
- `expense.py` — `Expense` (individual transactions)
- `cash_flow_entry.py` — `CashFlowEntry` (editable OCF rows per month)
- `config_item.py` — `ConfigItem` (all 8 dropdown lists in one table)
- `asset.py` — `Asset` (asset metadata; shared across FYs)
- `asset_monthly_value.py` — `AssetMonthlyValue` (monthly INR amount per asset per FY; keyed by `asset_id + month_key + fy_start_year`)
- `protection_target.py` — `ProtectionTarget` (4 fixed rows: Emergency Funds, Term Insurance, Gold, Silver)
- `liquid_asset.py` — `LiquidAsset` (single row per user: current/target Fixed/Savings/Cash)
- `precious_metal.py` — `PreciousMetal` (gold/silver holdings with live price integration)
- `budget_entry.py` — `BudgetEntry` (per-user, per-FY, per-category budget rows: `amount_per_month × qty = projected`; unique on `(user_id, fy_start_year, category)`)
- `budget_summary.py` — `BudgetSummary` (per-user, per-FY user-entered summary values: expected income, tax loss, target saving; unique on `(user_id, fy_start_year)`)

### `schemas/`
Pydantic models for request/response validation:
- `auth.py` — `LoginRequest`, `LoginResponse`, `UserOut`, `CreateUserRequest`, `UpdateUserRequest`
- `expense.py` — `ExpenseCreate`, `ExpenseUpdate`, `ExpenseOut`
- `cash_flow.py` — `CashFlowEntryOut`, `CashFlowUpdate`, `CashFlowBulkItem`
- `config_item.py` — `ConfigItemCreate`, `ConfigItemUpdate`, `ConfigItemOut`
- `dashboard.py` — `DashboardOut`, `CategoryRow`, `FinancialSummary`
- `month_year.py` — `MonthYearOut`
- `asset.py` — `AssetCreate`, `AssetUpdate`, `AssetOut`, `AssetMonthlyValueOut`, `AssetMonthlyValueUpsert`
- `protection_target.py` — `ProtectionTargetOut`, `ProtectionTargetUpdate`
- `liquid_asset.py` — `LiquidAssetOut`, `LiquidAssetUpdate`
- `precious_metal.py` — `PreciousMetalCreate`, `PreciousMetalUpdate`, `PreciousMetalOut`, `MetalPriceOut`
- `budget.py` — `BudgetEntryUpsert`, `BudgetEntryOut`, `BudgetEntriesBulkUpsert`, `ActualsResponse`, `CategoryActual`, `MonthBreakdownItem`, `MonthlySummaryItem`, `BudgetSummaryUpsert`, `BudgetSummaryOut`

### `services/`
All business logic lives here — no SQL in routers:
- `auth_service.py` — validates credentials, returns JWT; also `list/create/update/delete_user`
- `month_service.py` — `get_or_create_month` (legacy), `find_month` (404 if not found, never creates), `create_month` (explicit create, 409 if already exists); all seed 23 OCF rows on creation
- `expense_service.py` — CRUD + `amount_cc` auto-set + aggregation queries
- `cash_flow_service.py` — OCF row reads/writes; computed rows calculated from expense sums
- `config_service.py` — CRUD for all dropdown lists; validates `list_type`
- `dashboard_service.py` — orchestrates all 3 dashboard sections in one call
- `asset_service.py` — asset CRUD + `upsert_monthly_value(asset_id, month_key, fy_start_year, amount)` + `delete_monthly_value`
- `protection_target_service.py` — `find` (returns existing rows, never seeds); `seed` (explicit one-time setup of 4 fixed rows); `update`
- `liquid_asset_service.py` — `find` (returns row or None, never creates); `create` (explicit one-time setup); `update`
- `precious_metal_service.py` — full CRUD + `fetch_metal_price(metal)` (httpx → metals.live + exchangerate-api → INR/gram; returns None on failure)
- `budget_service.py` — `list_entries`, `bulk_upsert_entries` (all categories in one transaction), `get_actuals_by_category` (cross-range JOIN query on month_years + expenses), `get_monthly_breakdown` (per-month category sums for Apr→Mar), `get_monthly_summary` (per-month income/spending/investment), `get_or_create_summary`, `update_summary`

### `routers/`
FastAPI routers. Each is a thin adapter — validates input, calls service, returns response:
- `auth.py` — `POST /api/auth/login`, `GET /api/auth/me`
- `users.py` — `GET/POST/PUT/DELETE /api/users/...`
- `months.py` — `GET/DELETE /api/months/...`
- `expenses.py` — `GET/POST /api/months/{id}/expenses`, `PUT/DELETE /api/expenses/{id}`
- `cash_flow.py` — `GET /api/months/{id}/cashflow`, `PUT .../cashflow/{row_key}`
- `config_items.py` — `GET/POST/PUT/DELETE /api/config/...`
- `dashboard.py` — `GET /api/months/{id}/dashboard`
- `assets.py` — asset CRUD + monthly values (`PUT/DELETE /api/assets/{id}/monthly/{fy_year}/{month_key}`) + protection targets (check-or-init pattern) + liquid asset (check-or-init pattern) + precious metals + live metal price
- `budget.py` — `GET/PUT /api/budget/{fy_start_year}/entries`, `GET /api/budget/{fy_start_year}/actuals` (query params: start/end year+month), `GET/PUT /api/budget/{fy_start_year}/summary`, `GET /api/budget/{fy_start_year}/monthly-breakdown`, `GET /api/budget/{fy_start_year}/monthly-summary`
- `deps.py` — `get_current_user` dependency (JWT → User object)

**Router ordering in `main.py`:** `expenses`, `cash_flow`, `dashboard` are registered before `months` to prevent the `/{year}/{month}` wildcard from shadowing sub-paths. Similarly, static asset sub-routes (`/protection-targets`, `/liquid-asset`, etc.) are declared before `/{asset_id}` in `assets.py`.

### `seed.py`
One-time seed script. Creates `admin` user (password: `admin123`) and all 80+ default
config items. Safe to re-run — skips existing entries.

---

## Frontend File Map

### `src/main.tsx`
React entry point. Wraps app in `QueryClientProvider` (TanStack Query).

### `src/App.tsx`
Router setup. Defines `ProtectedRoute` wrapper. Routes:
- `/login` → `LoginPage`
- `/graphs` → `GraphPage` (current FY)
- `/graphs/:fyYear` → `GraphPage` (specific FY)
- `/budget` → `BudgetPage` (current FY)
- `/budget/:fyYear` → `BudgetPage` (specific FY)
- `/assets` → `AssetPage` (current FY)
- `/assets/:fyYear` → `AssetPage` (specific FY, e.g. `/assets/2025` = FY 2025-26)
- `/expenses` → `ExpensePage` (current month)
- `/expenses/:year/:month` → `ExpensePage` (specific month)
- `/users` → `UserManagementPage`
- `/config` → `ConfigPage`

### `src/types/index.ts`
All TypeScript interfaces matching backend Pydantic schemas.
Single source of truth for types used across API, stores, and components.

### `src/api/`
One file per API resource. Each exports typed async functions using the Axios instance.
- `axiosInstance.ts` — base URL, auth header interceptor, 401→logout redirect
- `authApi.ts`, `expenseApi.ts`, `cashFlowApi.ts`, `configApi.ts`, `dashboardApi.ts`
- `monthApi.ts` — `listMonths`, `checkMonth` (no-create, returns null on 404), `createMonth` (explicit), `getOrCreateMonth` (legacy)
- `userApi.ts` — `listUsers`, `createUser`, `updateUser`, `deleteUser`
- `assetApi.ts` — all asset functions including `upsertMonthlyValue(assetId, monthKey, amount, fyStartYear)`; `listProtectionTargets` (empty array if not set up) + `initProtectionTargets` (explicit setup); `getLiquidAsset` (null if not set up) + `initLiquidAsset` (explicit setup); precious metals; live metal price
- `budgetApi.ts` — `getBudgetEntries`, `saveBudgetEntries` (bulk PUT), `getBudgetActuals` (cross-range category sums), `getBudgetSummary`, `saveBudgetSummary`, `getMonthlyBreakdown`, `getMonthlySummary`

### `src/store/`
Zustand stores for client-only state:
- `authStore.ts` — token + username from localStorage; `login()`, `logout()`
- `configStore.ts` — all dropdown configs cached in memory; `fetchConfigs()`, `invalidate()`

### `src/components/layout/`
- `AppShell.tsx` — outer layout with `<Outlet />`
- `Navbar.tsx` — top nav with links and sign-out; order: Graphs → Budget → Assets → Expenses → Users → Configuration

### `src/components/common/`
- `CurrencyCell.tsx` — formats number as ₹X,XX,XXX.XX using `Intl.NumberFormat('en-IN')`
- `Modal.tsx` — accessible dialog (Escape to close)
- `LoadingSpinner.tsx` — spinning indicator with label

### `src/components/expense/`
- `ExpenseTable.tsx` — table of expenses with add/edit/delete
- `AddExpenseModal.tsx` — form modal for new expense
- `EditExpenseModal.tsx` — form modal for editing existing expense
- `CategorySummaryTable.tsx` — dashboard section 1 (category totals)
- `OperatingCashFlowTable.tsx` — dashboard section 2 (25-row OCF, inline editing)
- `FinancialSummaryTable.tsx` — dashboard section 3 (income/spent/open)

### `src/components/config/`
- `ConfigList.tsx` — renders one dropdown list with add/delete controls

### `src/components/asset/`
- `AssetSummaryTable.tsx` — read-only; totals grouped by sub-category for the selected FY
- `AssetDetailsTable.tsx` — inline-editable FY grid (dropdowns + month inputs); blur-saves; uses `fyStartYear` to filter and save monthly values
- `ProtectionTargetsTable.tsx` — 4 fixed rows (Emergency Funds, Term Insurance, Gold, Silver); blur-save
- `LiquidAssetsTable.tsx` — single row, Current/Target groups × Fixed/Savings/Cash
- `PreciousMetalsTable.tsx` — add/delete rows; current value = live price × grams with amber manual override

### `src/components/budget/`
- `BudgetCategoryTable.tsx` — inline-editable table; one row per EXPENSE_CATEGORY; columns: Category | Amount/Month | Qty | Projected | Actual | progress bar (green <80%, amber 80-100%, red >100%); blur triggers bulk save
- `BudgetSummaryTable.tsx` — 2-column Label/Amount table; editable rows (Expected Income, tax/saving fields) saved on blur; computed rows (Projected Expenditure, Actual Expenditure, Actual Saving) shown in grey

### `src/utils/`
- `financialYear.ts` — `getCurrentFY()`, `getFYForYear(startYear)`, `listKnownFYs(assets)`, month key constants

### `src/pages/`
- `LoginPage.tsx` — login form, calls `POST /api/auth/login`
- `ExpensePage.tsx` — multi-year month navigation (‹/› arrows + month/year jump pickers spanning 60 years in each direction); uses `GET /check` to detect if month exists without creating it; shows a "Start Month" button for new months so the DB record is only created on explicit user action
- `ConfigPage.tsx` — grid of all 8 `ConfigList` components
- `UserManagementPage.tsx` — list users, add user form, edit modal; delete hidden for logged-in user
- `AssetPage.tsx` — reads `fyYear` from URL params; Prev/Next/Current FY navigation; renders all 5 asset tables. Protection Targets and Liquid Assets sections show a "Set up" placeholder with an Initialise button instead of auto-creating rows on page load
- `BudgetPage.tsx` — reads `fyYear` from URL params; default range April→March of selected FY; date range selectors re-query actuals; bulk-saves category budget entries on blur; budget summary entries save on blur
- `GraphPage.tsx` — reads `fyYear` from URL params; 5 Recharts panels (stacked bar, donut pie, multi-line, grouped bar projected vs actual, area chart); all data from budget API endpoints + existing assets endpoint

---

## How To

### Add a new expense category
Open the app → Configuration → Expense Categories → type value → "+ Add"

### Add a new credit card
Open the app → Configuration → Credit Cards → type value → "+ Add"

### Start tracking a new month
Navigate to the month using ‹/› arrows or the jump pickers on the Expenses page, then click **"Start [Month] [Year]"**. The month record and all cash flow rows are created at that point. Navigating without clicking does not create anything in the database.

### Add a new Cash Flow row
1. Add entry to `CASH_FLOW_ROWS` in `backend/core/cash_flow_rows.py`
2. If it contributes to "income", add its key to `INCOME_ROW_KEYS`
3. Restart backend — new rows are seeded when a month is created via `POST /api/months/{y}/{m}`

### Add a new config list type
1. Add `"MY_NEW_LIST"` to `VALID_LIST_TYPES` in `backend/services/config_service.py`
2. Add default values in `backend/seed.py` and run `python seed.py`
3. Add `{ key: 'MY_NEW_LIST', title: '...' }` to `LIST_CONFIG` in `frontend/src/pages/ConfigPage.tsx`

### Run a DB migration (SQLite, no Alembic)
When a new column is added to an existing table, `create_all` won't add it automatically.
Run the one-off migration script from the backend directory:
```powershell
cd backend
.\.venv\Scripts\python.exe migrate_monthly_year.py
```
Then restart the backend. Existing migration scripts are idempotent (safe to re-run).

### Switch database to PostgreSQL
```bash
export DATABASE_URL=postgresql://user:pass@localhost/trackerdb
```
On first run, ensure the database exists. SQLAlchemy will create all tables.

### Add a new page
1. Create `frontend/src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`: `<Route path="/new" element={<NewPage />} />`
3. Add nav link in `src/components/layout/Navbar.tsx`
4. If it needs a backend endpoint: model → schema → service → router → register in `main.py`

### Production build
```bash
cd frontend && npm run build    # outputs to frontend/dist/
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```
Serve `frontend/dist/` as static files (nginx, Caddy, or Spring Boot static).

---

## Environment Variables (additional)

| Variable | Default | Description |
|---|---|---|
| `SERVE_STATIC` | `false` | Set to `true` in Docker to serve the built React SPA from FastAPI |

When `SERVE_STATIC=true`, `backend/main.py` mounts `frontend/dist/assets` as a static directory and adds a catch-all route that returns `index.html` for all non-API paths. This block activates only after all API routers are registered (it is at the bottom of `main.py`) so it never shadows `/api/` routes.

In local development (Vite dev server), `SERVE_STATIC` is never set, so the block is inactive. Only set this in the Docker container or when serving a production build directly from uvicorn.

---

## Docker

The project ships with a multi-stage `Dockerfile`:

1. **Stage 1 (`frontend-build`)** — `node:20-alpine` builds the Vite React app. Output is `/app/frontend/dist/`.
2. **Stage 2 (`runtime`)** — `python:3.11-slim` installs Python deps, copies backend source and the compiled frontend, then runs `seed.py + uvicorn`.

The `docker-compose.yml` in the repo root is designed to be placed one directory above the git clone:

```
/opt/blr-stack/
├── docker-compose.yml   ← this file (copied from the repo)
└── expenseandassettracker/  ← git clone
```

The build context in `docker-compose.yml` is `./expenseandassettracker` which resolves correctly from the parent directory. A named Docker volume (`tracker_data`) persists the SQLite database across container rebuilds.

**Key env vars in Docker:**
- `SERVE_STATIC=true` — enables FastAPI static file serving
- `DATABASE_URL=sqlite:////app/data/tracker.db` — four slashes for absolute path inside container
- `JWT_SECRET` — **always override** this in production

---

## PWA

The app is a Progressive Web App (PWA):
- **Manifest**: `frontend/public/icons/` + `vite.config.ts` manifest config
- **Service Worker**: auto-generated by `vite-plugin-pwa` on `npm run build`
- **Caching strategy**: NetworkFirst for `/api/**` (fresh data + offline fallback)
- **Install**: Chrome/Edge will show "Install app" prompt after first visit

---

## Security Notes

1. Change `JWT_SECRET` in production — the default is public
2. Change the default `admin` password after first login (add a `/api/auth/change-password` endpoint)
3. In production, restrict CORS origins in `backend/main.py` to your actual frontend domain
4. Use HTTPS in production — JWT tokens in localStorage are readable by JS
