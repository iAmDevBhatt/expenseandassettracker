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
GET    /api/config                      All 8 lists as {list_type: [items]}
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
