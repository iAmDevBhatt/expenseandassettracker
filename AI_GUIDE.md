# AI Guide — Expense & Asset Tracker

This document tells any AI how to connect to the database, understand the data model,
call the API, and extend the project.

---

## 1. Project Overview

A personal monthly expense and asset tracker. Users record expenses per month, track
operating cash flow (income, balances, deductions), and view a financial summary.
All amounts are in Indian Rupees (INR, ₹).

**Tech stack:** Python FastAPI backend, React + Vite frontend, SQLite (default) / PostgreSQL.

---

## 2. Database Connection

### SQLite (default)
- File: `backend/data/tracker.db`
- Connect: `sqlite:///./data/tracker.db`
- Tool: any SQLite client (DB Browser, sqlite3 CLI, Python sqlite3 module)

```python
import sqlite3
conn = sqlite3.connect("backend/data/tracker.db")
```

### PostgreSQL (optional)
Set env var `DATABASE_URL=postgresql://user:pass@localhost/trackerdb` before starting the backend.

---

## 3. Table Catalog

### `users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| username | TEXT | unique, not null |
| password_hash | TEXT | BCrypt hash |
| created_at | DATETIME | |

### `month_years`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE delete |
| year | INTEGER | e.g. 2025 |
| month | INTEGER | 1–12 |
| created_at | DATETIME | |

UNIQUE(user_id, year, month)

### `expenses`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| month_year_id | INTEGER FK → month_years.id | CASCADE |
| expense_date | DATE | |
| amount | NUMERIC(15,2) | total amount |
| description | TEXT | nullable |
| amount_cc | NUMERIC(15,2) | = amount when paid_via_cc is set; else NULL |
| paid_via_cc | TEXT | credit card name; nullable |
| category | TEXT | value from EXPENSE_CATEGORY config list |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### `cash_flow_entries`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| month_year_id | INTEGER FK → month_years.id | CASCADE |
| row_key | TEXT | see Row Key Reference below |
| manual_amount | NUMERIC(15,2) | 0 for empty rows |
| sort_order | INTEGER | display order |

UNIQUE(month_year_id, row_key)

**Note:** Rows `SPENT_VIA_CC` and `SPENT` are never stored — they are computed at query time.

### `config_items`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| list_type | TEXT | see List Types below |
| value | TEXT | the dropdown option label |
| sort_order | INTEGER | display order |
| is_active | BOOLEAN | soft-delete flag |
| created_at | DATETIME | |

UNIQUE(list_type, value)

### `assets`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| asset_category | TEXT | from ASSET_CATEGORY config |
| asset_holder | TEXT | from ASSET_HOLDER config |
| asset_sub_category | TEXT | from ASSET_SUB_CATEGORY config |
| account_number | TEXT | bank/broker account number; nullable |
| name | TEXT | |
| current_value | NUMERIC(15,2) | |
| notes | TEXT | |
| as_of_date | DATE | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### `asset_monthly_values`
Monthly INR amounts per asset per financial year month.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| asset_id | INTEGER FK → assets.id | CASCADE delete |
| month_key | TEXT (3) | APR MAY JUN JUL AUG SEP OCT NOV DEC JAN FEB MAR |
| fy_start_year | INTEGER | e.g. 2025 for FY 2025-26 |
| amount | NUMERIC(15,2) | nullable |

UNIQUE(asset_id, month_key, fy_start_year)

Financial year = Apr `fy_start_year` → Mar `fy_start_year + 1`.

### `protection_targets`
4 fixed rows per user: Emergency Funds, Term Insurance, Gold, Silver.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| category | TEXT | one of the 4 fixed categories |
| current_value | NUMERIC(15,2) | nullable |
| target_value | NUMERIC(15,2) | nullable |

UNIQUE(user_id, category). Rows are created only when the user explicitly clicks "Set up Protection Targets" — never auto-seeded on page load.

### `liquid_assets`
Single row per user (current + target values for Fixed/Savings/Cash).

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | UNIQUE, CASCADE |
| current_fixed / current_savings / current_cash | NUMERIC(15,2) | nullable |
| target_fixed / target_savings / target_cash | NUMERIC(15,2) | nullable |

### `precious_metals`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| metal_type | TEXT | Gold / Silver / Gold Bar |
| carat | TEXT | 24K / 22K / 18K / 14K / 9999 / n/a |
| grams | NUMERIC(10,4) | |
| purchase_price | NUMERIC(15,2) | |
| amount_spent | NUMERIC(15,2) | |
| current_value_override | NUMERIC(15,2) | manual override; if NULL, current value = live price × grams |

### `loan_settings`
Single row per user. Backs the "Personal Loan Interest %" field on the Configuration page.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | UNIQUE, CASCADE |
| personal_loan_interest_pct | NUMERIC(8,4) | nullable; monthly % charged on outstanding self-loans |
| created_at / updated_at | DATETIME | |

### `loan_account_columns`
The loan-account columns shared by the Withdrawn and Credited ledger tables. Global per user
(not per FY) so a balance carries across years. `name` mirrors a `LOAN_ACCOUNT` config value but
is stored as free text — config renames do not cascade.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| name | TEXT(200) | |
| sort_order | INTEGER | |

UNIQUE(user_id, name)

### `loan_entries`
One dated row in the Withdrawn or Credited table for one financial year.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| fy_start_year | INTEGER | e.g. 2025 for FY 2025-26 |
| side | TEXT(10) | `WITHDRAWN` or `CREDITED` |
| entry_date | DATE | nullable |
| sort_order | INTEGER | |
| created_at / updated_at | DATETIME | |

### `loan_entry_amounts`
One amount cell = (loan entry row) × (loan account column).

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| loan_entry_id | INTEGER FK → loan_entries.id | CASCADE |
| account_name | TEXT(200) | matches a `loan_account_columns.name` |
| amount | NUMERIC(15,2) | nullable |

UNIQUE(loan_entry_id, account_name)

### `loans_given`
Money lent to other people — the "bad debt" awareness tracker. Not FY-scoped.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE |
| given_date | DATE | nullable |
| person_name | TEXT(200) | nullable |
| payment_method | TEXT(100) | nullable (free text) |
| loan_amount | NUMERIC(15,2) | nullable |
| cleared_date | DATE | nullable |
| paid_amount | NUMERIC(15,2) | nullable |
| notes | TEXT | nullable |
| created_at / updated_at | DATETIME | |

---

## 4. Row Key Reference (cash_flow_entries)

| row_key | label | computed? |
|---|---|---|
| NET_SALARY | Net Salary | No |
| RENT_2BHK | 2bhk Rent | No |
| RENT_1BHK | 1bhk Rent | No |
| TEJAS | Tejas | No |
| INTEREST_SBI | SBI (Bank interest) | No |
| INTEREST_HDFC_1 | HDFC 50100512001064 (Bank interest) | No |
| INTEREST_HDFC_2 | HDFC 50100164914736 (Bank interest) | No |
| INTEREST_PNB_1 | PNB 0408010147770 (Bank interest) | No |
| INTEREST_PNB_2 | PNB 0408010244121 (Bank interest) | No |
| DIVIDENDS | Dividends | No |
| INCOME_INVESTMENTS | Income from Investments | No |
| TAX_DEDUCTED | Tax Deducted From Salary | No |
| PF_DEDUCTED | PF Deducted | No |
| PROFESSIONAL_TAX | Professional Tax | No |
| GROSS_SALARY | Gross Salary | No |
| INVESTMENT_ACTIVITY | Investment Activity | No |
| NET_INCOME_APART_SALARY | Net Income apart from salary | No |
| NET_TOTAL_INCOME | Net total income | No |
| REMAINING | Remaining | No |
| HDFC_CURR_ACCOUNT | HDFC CurrAccount | No |
| HDFC_ANOTHER_ACCOUNT | HDFC Another Account | No |
| SBI_ACCOUNT | SBI | No |
| UNITED_BANK | United bank | No |
| SPENT_VIA_CC | Spent via CreditCard | **Yes** |
| SPENT | Spent | **Yes** |

---

## 5. Config List Types

| list_type | Purpose |
|---|---|
| EXPENSE_CATEGORY | Dropdown for expense category |
| CREDIT_CARD | Dropdown for "Paid via CC" |
| MONTHLY_MUST | Monthly essential expenses |
| TOTALLY_ESSENTIAL | Non-negotiable expenses |
| ASSET_CATEGORY | Asset type classification |
| ASSET_HOLDER | Bank/broker holding an asset |
| ASSET_SUB_CATEGORY | Asset instrument type |
| IGNORE_CATEGORY | Self-loan adjustments (excluded from spending calc) |
| LOAN_ACCOUNT | Savings accounts you take self-loans from (Loan page ledger columns) |

---

## 6. API Base URL

Default: `http://localhost:8000`

Interactive docs (Swagger UI): `http://localhost:8000/docs`

---

## 7. Authentication

All endpoints (except `POST /api/auth/login`) require a JWT Bearer token.

**Get a token:**
```
POST /api/auth/login
Content-Type: application/json

{"username": "admin", "password": "admin123"}

→ {"token": "eyJ...", "expires_in": 86400, "username": "admin"}
```

**Use the token:**
```
Authorization: Bearer eyJ...
```

Token lifetime: 24 hours.

---

## 8. Full Endpoint Reference

### Auth
```
POST   /api/auth/login          Login, returns JWT
GET    /api/auth/me             Get current user info
```

### Months
```
GET    /api/months                    List all months (newest first)
GET    /api/months/{year}/{m}         Get or auto-create a month record (legacy — still works)
GET    /api/months/{year}/{m}/check   Check if month exists — returns 200+record or 404; NEVER creates
POST   /api/months/{year}/{m}         Explicitly create a month; 409 if already exists
DELETE /api/months/{id}               Delete month + all its data (cascade)
```

**Creation behaviour:** The UI uses `/check` to detect whether a month exists, and only calls `POST` when the user explicitly clicks "Start Month". Navigating to a new month URL no longer silently creates a DB record.

### Expenses
```
GET    /api/months/{id}/expenses        List expenses for a month
POST   /api/months/{id}/expenses        Create expense
       Body: {expense_date, amount, description?, paid_via_cc?, category}
       Note: amount_cc is auto-set by backend (= amount when paid_via_cc is set)
PUT    /api/expenses/{id}               Update expense
DELETE /api/expenses/{id}               Delete expense
```

### Cash Flow
```
GET    /api/months/{id}/cashflow        All 25 rows (23 editable + 2 computed)
PUT    /api/months/{id}/cashflow/{key}  Update one editable row
       Body: {amount: 85000.00}
       Error 400 if row_key is SPENT_VIA_CC or SPENT
POST   /api/months/{id}/cashflow/bulk   Batch update
       Body: [{row_key, amount}, ...]
```

### Dashboard
```
GET    /api/months/{id}/dashboard       Full dashboard in one call
Response:
{
  "category_summary": [{"category": "Investment", "amount": 18200.00}],
  "cash_flow": [{row_key, label, amount, computed, sort_order}, ...],
  "financial_summary": {
    "income": 95000.00,
    "spent_minus_investment": 42000.00,
    "investment": 18200.00,
    "ignore": 0.00,
    "open": 34800.00
  }
}
```

### Config
```
GET    /api/config                      All 9 lists as {list_type: [items]}
GET    /api/config/{list_type}          One list
POST   /api/config/{list_type}          Add item — body: {value: "New Item"}
PUT    /api/config/{list_type}/{id}     Edit item — body: {value, sort_order}
DELETE /api/config/{list_type}/{id}     Soft-delete (sets is_active=false)
```

### Users
```
GET    /api/users               List all users
POST   /api/users               Create user — body: {username, password}
PUT    /api/users/{id}          Update user — body: {username?, password?}
DELETE /api/users/{id}          Delete user (cannot delete yourself)
```

### Assets
```
GET    /api/assets                              List all assets (includes monthly_values for all FYs)
POST   /api/assets                              Create asset
PUT    /api/assets/{id}                         Update asset metadata
DELETE /api/assets/{id}                         Delete asset + all monthly values

# Monthly values (one row per asset × month × FY)
PUT    /api/assets/{id}/monthly/{fy_year}/{key} Upsert a monthly amount
       Body: {amount: 50000.00}
       fy_year: e.g. 2025 (for FY 2025-26)
       key: APR | MAY | JUN | JUL | AUG | SEP | OCT | NOV | DEC | JAN | FEB | MAR
DELETE /api/assets/{id}/monthly/{fy_year}/{key} Delete a monthly value

# Protection & Savings Targets
GET    /api/assets/protection-targets           List existing rows — empty array if not yet set up; NEVER auto-seeds
POST   /api/assets/protection-targets/init      Explicitly seed the 4 fixed rows; idempotent
PUT    /api/assets/protection-targets/{id}      Update — body: {current_value?, target_value?}

# Liquid Assets
GET    /api/assets/liquid-asset                 Get single row — 404 if not yet set up; NEVER auto-creates
POST   /api/assets/liquid-asset/init            Explicitly create the row; idempotent
PUT    /api/assets/liquid-asset                 Update — body: {current_fixed?, current_savings?, current_cash?, target_fixed?, target_savings?, target_cash?}

# Precious Metals
GET    /api/assets/precious-metals              List all rows
POST   /api/assets/precious-metals              Create row
PUT    /api/assets/precious-metals/{id}         Update row
DELETE /api/assets/precious-metals/{id}         Delete row

# Live metal price (fetched from public API, returns null on failure)
GET    /api/assets/metal-price/{metal}          metal: gold | silver | gold_bar
       Response: {price_per_gram: 7234.50, currency: "INR"}
```

### Loans (self-loan tracker)
```
# Settings — one row per user; auto-created on first GET
GET    /api/loans/settings                      → {personal_loan_interest_pct}
PUT    /api/loans/settings                       Body: {personal_loan_interest_pct: 1.5 | null}

# Ledger account columns (shared by the Withdrawn & Credited tables; global per user)
GET    /api/loans/columns                        → [{id, name, sort_order}]
POST   /api/loans/columns                        Body: {name: "SBI Savings"}   409 if duplicate
DELETE /api/loans/columns/{column_id}            Also deletes every amount cell for that account

# Per-FY ledger data
GET    /api/loans/{fy_start_year}/data
       → {
           withdrawn: [{id, side, entry_date, amounts: {account_name: number|null}}],
           credited:  [{id, side, entry_date, amounts: {...}}],
           prior:     {account_name: {withdrawn, credited}}   # summed over all FYs < fy_start_year
         }
       Opening balance carried into this FY = prior[acct].withdrawn − prior[acct].credited

POST   /api/loans/{fy_start_year}/entries        Body: {side: "WITHDRAWN"|"CREDITED", entry_date?}
PUT    /api/loans/entries/{entry_id}             Body: {entry_date?}
DELETE /api/loans/entries/{entry_id}             Cascades its amount cells
PUT    /api/loans/entries/{entry_id}/amounts/{account_name}   Body: {amount: number | null}
       Upsert one cell; null deletes it

# Loans given to others (bad-debt watch; not FY-scoped)
GET    /api/loans/given                          → [{id, given_date, person_name, payment_method,
                                                    loan_amount, cleared_date, paid_amount, notes}]
POST   /api/loans/given                          Body: any subset of the fields above
PUT    /api/loans/given/{id}                     Partial update
DELETE /api/loans/given/{id}
```

**Client computes** (from `/data` + settings):
```
perAccount.current      = prior.withdrawn + Σ(FY withdrawn) − prior.credited − Σ(FY credited)
perAccount.interest     = personal_loan_interest_pct / 100 × perAccount.current
Total Loan Amount       = Σ (prior.withdrawn + Σ FY withdrawn)     over all account columns
Total Remaining Loan Amt = Σ perAccount.current
loans_given.outstanding = loan_amount − paid_amount
```

---

## 9. Computed Field Rules

### `amount_cc` on Expense
- Set to `amount` when `paid_via_cc` is a non-empty string
- Set to `NULL` when `paid_via_cc` is empty/null
- Client never sends `amount_cc`; backend always computes it

### `SPENT_VIA_CC` (cash flow row)
```
SPENT_VIA_CC = SUM(expenses.amount_cc) WHERE month_year_id = <id> AND amount_cc IS NOT NULL
```

### `SPENT` (cash flow row)
```
SPENT = SUM(expenses.amount) WHERE month_year_id = <id>  −  SPENT_VIA_CC
```

### Financial Summary formulas
```python
income = sum of OCF rows: NET_SALARY, RENT_2BHK, RENT_1BHK, TEJAS,
         INTEREST_SBI, INTEREST_HDFC_1, INTEREST_HDFC_2,
         INTEREST_PNB_1, INTEREST_PNB_2, DIVIDENDS, INCOME_INVESTMENTS

investment = SUM(expenses.amount WHERE category = 'Investment')

ignore = SUM(expenses.amount WHERE category IN IGNORE_CATEGORY config items)
         (default: "Negative Adjustment(Loan From Future me)",
                   "Positive Adjustment(Loan from Past me)")

spent_total = SPENT_VIA_CC + SPENT

spent_minus_investment = spent_total - investment - ignore

open = income - spent_minus_investment - investment
```

---

## 10. How to Add a New Month (programmatically)

```
GET /api/months/2025/9
```
This call:
1. Checks if a MonthYear record exists for user + 2025 + September
2. If not, creates it and seeds 23 empty `cash_flow_entries` rows (all non-computed)
3. Returns the MonthYear record

---

## 11. Extension Points

To add a new feature:
1. **New entity** → add a new SQLAlchemy model in `backend/models/`, create a schema in `backend/schemas/`, add a service in `backend/services/`, register a router in `backend/main.py`
2. **New config list** → add `list_type` to `VALID_LIST_TYPES` in `backend/services/config_service.py` and seed defaults in `backend/seed.py`
3. **New cash flow row** → add entry to `CASH_FLOW_ROWS` in `backend/core/cash_flow_rows.py`; it auto-appears in the OCF table
4. **New frontend page** → add component in `frontend/src/pages/`, register route in `frontend/src/App.tsx`, add nav link in `frontend/src/components/layout/Navbar.tsx`

---

## 12. Budget Tables (Phase 3)

### `budget_entries`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE delete |
| fy_start_year | INTEGER | e.g. 2025 for FY 2025-26 |
| category | TEXT(200) | matches EXPENSE_CATEGORY config value |
| amount_per_month | NUMERIC(15,2) | user-set monthly budget per category |
| qty | INTEGER | 0–12 (number of months this budget applies) |
| created_at | DATETIME | |
| updated_at | DATETIME | |

UNIQUE(user_id, fy_start_year, category). The `category` field is free-text matching the EXPENSE_CATEGORY config values — it is NOT a FK so renames in config do not cascade.

### `budget_summaries`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | CASCADE delete |
| fy_start_year | INTEGER | |
| expected_income | NUMERIC(15,2) | nullable |
| projected_loss_tax | NUMERIC(15,2) | nullable |
| projected_target_saving | NUMERIC(15,2) | nullable |
| targeted_saving | NUMERIC(15,2) | nullable |
| actual_loss_tax | NUMERIC(15,2) | nullable |
| created_at | DATETIME | |
| updated_at | DATETIME | |

UNIQUE(user_id, fy_start_year). Three summary table rows are always computed (Projected Expenditure, Actual Expenditure, Actual Saving) and never stored.

### Budget API Endpoints
```
GET  /api/budget/{fy_start_year}/entries
     → List all budget entries for the user+FY; empty array if none

PUT  /api/budget/{fy_start_year}/entries
     Body: {fy_start_year: int, entries: [{category, amount_per_month, qty}, ...]}
     → Bulk upsert (insert or update) all entries in one transaction

GET  /api/budget/{fy_start_year}/actuals
     Query: start_year, start_month, end_year, end_month
     → Cross-range expense sums per category; joins month_years → expenses
     Response: {actuals: [{category, actual}], total_actual}

GET  /api/budget/{fy_start_year}/monthly-breakdown
     → Per-month category sums for Apr fyYear → Mar fyYear+1
     Response: [{year, month, categories: {category: amount}}, ...]

GET  /api/budget/{fy_start_year}/monthly-summary
     → Per-month income/spending/investment for the full FY
     Response: [{year, month, income, spending, investment}, ...]

GET  /api/budget/{fy_start_year}/summary
     → Get (or auto-create) the budget summary row for this FY

PUT  /api/budget/{fy_start_year}/summary
     Body: {expected_income?, projected_loss_tax?, projected_target_saving?, targeted_saving?, actual_loss_tax?}
     → Update the summary row
```

### Cross-range actuals query (SQLAlchemy)
```python
db.query(Expense.category, func.sum(Expense.amount))
  .join(MonthYear, Expense.month_year_id == MonthYear.id)
  .filter(
      MonthYear.user_id == user.id,
      or_(MonthYear.year > start_year,
          and_(MonthYear.year == start_year, MonthYear.month >= start_month)),
      or_(MonthYear.year < end_year,
          and_(MonthYear.year == end_year, MonthYear.month <= end_month)),
  )
  .group_by(Expense.category).all()
```

---

## 13. Docker / SERVE_STATIC

In Docker mode, FastAPI also serves the compiled React SPA. This is activated by the `SERVE_STATIC=true` environment variable. When set, `backend/main.py` (at the very bottom, after all routers are registered) mounts `frontend/dist/assets/` at `/assets` and `frontend/dist/icons/` at `/icons` as static directories, serves `/labels.properties` and `/favicon.ico` (→ `icons/icon-192.png`) explicitly, and adds a catch-all GET route that returns `index.html` for all other non-API paths.

```
SERVE_STATIC=true   → FastAPI serves frontend/dist/ (Docker production)
SERVE_STATIC=false  → No static serving (default; dev mode uses Vite)
```

The Dockerfile uses a multi-stage build: Node 20 Alpine builds the frontend, then Python 3.11 slim installs the backend. On every container start the entrypoint runs `migrate.py && seed.py && uvicorn`. The SQLite database is persisted via a Docker volume mounted at `/app/data/`.

### Schema upgrades (production-safe)

`Base.metadata.create_all()` (in `main.py`, `seed.py`, `migrate.py`) issues `CREATE TABLE IF NOT EXISTS` only — it **never** drops, alters, or truncates. A new model/table is picked up automatically with no data loss.

Changes to an **existing** table (add/rename/drop column, type change, new constraint) are *not* applied by `create_all`. Those go in `backend/migrate.py`: an ordered list of guarded, **idempotent, non-destructive** steps (`ALTER TABLE … ADD COLUMN` / backfill, skipped if already applied). It runs before `seed.py` on every start, so redeploying an image against an existing volume upgrades the schema in place without touching existing rows. Keep migrations additive (drop a retired column only in a later release) and back up the DB file before deploying one:
```
docker cp <container>:/app/data/tracker.db ./tracker-backup-$(date +%F).db
```
`docker-compose down` keeps the `tracker_data` volume; `docker-compose down -v` deletes it.

---

## 14. Responsive Design (Mobile / Tablet / Desktop)

The frontend is fully responsive using Tailwind CSS breakpoints. No backend changes are needed.

### Breakpoints used
| Prefix | Width | Target |
|--------|-------|--------|
| *(none)* | 0px+ | Mobile (≤ 639px) |
| `sm:` | 640px+ | Large phones / small tablets |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Desktop |

### Navbar (Navbar.tsx)
- Desktop (`lg:`): all nav links visible inline.
- Below `lg`: a hamburger button (three-bar → X animation) reveals a full-width dropdown menu. Links and user/logout are inside the dropdown; clicking a link closes the menu.

### Tables
All data tables use `overflow-x-auto` so they scroll horizontally on narrow screens without breaking the page layout. Wide tables (AssetSummaryTable, AssetDetailsTable) additionally carry `min-w-max` on the inner `<table>` to prevent column compression.

### ExpenseTable — card layout on mobile
Below `sm` (< 640px), the expense rows render as stacked cards instead of a table. Each card shows date, amount, description, CC info, category badge, and edit/delete buttons. The standard table reappears at `sm:`.

### Page padding
All full-width pages (`AssetPage`, `LoanPage`, `BudgetPage`, `GraphPage`) use `p-3 sm:p-6` so phones get tighter margins.

### Forms
Multi-column forms use `grid-cols-1 sm:grid-cols-2` so they stack on mobile.

### Charts (GraphPage)
All charts use Recharts `<ResponsiveContainer width="100%">` which handles resize automatically.

### LoanLedgerTables
Side-by-side ledger tables switch at `md:flex-row` (tablet and above) rather than `xl:`.

### BudgetPage date-range controls
Range selectors use `flex flex-wrap` with `gap-2` so they wrap naturally on narrow screens.

---

## 15. Expense Page Layout

`ExpensePage.tsx` renders content in two rows:

**Row 1 — side by side** (`grid grid-cols-1 xl:grid-cols-2 gap-6`):
- Left: `<ExpenseTable>` — the expense list with add/edit/delete
- Right: `<OperatingCashFlowTable>` — the 25-row OCF table

On screens narrower than `xl` (1280px) these stack vertically.

**Row 2 — side by side** (`grid grid-cols-1 md:grid-cols-2 gap-6`):
- Left: `<CategorySummaryTable>`
- Right: `<FinancialSummaryTable>`

---

## 16. Searchable Category Dropdown (AddExpenseModal)

`AddExpenseModal.tsx` replaces the native `<select>` for the category field with a custom combobox:

- A text `<input>` lets the user type to filter `configs.EXPENSE_CATEGORY` items.
- A floating dropdown (absolute-positioned, `z-50`, max-height scrollable) shows matching options.
- Clicking an option sets `form.category` and closes the dropdown.
- When a category is selected and the search box is empty, the selected value is shown via an absolutely-positioned `<span>` overlay (pointer-events-none) so it reads like a normal field.
- A `mousedown` listener on `document` closes the dropdown when the user clicks outside (`categoryRef`).
- The `valid` check still requires `form.category` to be non-empty before the form can submit.

**EditExpenseModal** uses the same `<select>` pattern and has not been changed — apply the same combobox treatment there if needed.

---

## 17. Budget Category Table — Add / Delete Rows

`BudgetCategoryTable.tsx` manages a `visibleCategories` local state (initially the categories that already have a saved `BudgetEntry`). The full `categories` prop (from `configs.EXPENSE_CATEGORY`) is still passed but used only as the universe of available options.

### Delete a row
Each table row has an `×` button (rightmost column). Clicking it:
1. Builds `allEntries` from the remaining visible categories (preserving any in-progress edits).
2. Appends a zero entry `{ category, amount_per_month: 0, qty: 0 }` for the deleted category so the backend records the zero (the bulk-upsert endpoint always overwrites).
3. Calls `onSave(allEntries)` immediately.
4. Removes the category from `visibleCategories` and clears its `editing` state.

### Add a row
Below the table, an `+ Add category` button opens a searchable input. The dropdown lists only `hiddenCategories` (categories in the `categories` prop that are not currently in `visibleCategories`). Selecting one appends it to `visibleCategories` with default values `0 / 0` — the user then edits and tabs away to save.

### Sync on reload
A `useEffect` on `entries` re-merges persisted categories into `visibleCategories` after each successful save, so a page refresh always shows all categories that have non-zero backend entries.
