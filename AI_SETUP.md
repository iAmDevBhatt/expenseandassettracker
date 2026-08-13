# AI Setup Guide — Automated Install & Startup

This document is written for an AI agent to read and execute sequentially.
Every step includes the exact shell command to run, what to check, and what to do if it fails.
All commands assume the working directory is the project root unless stated otherwise.

Platform assumed: **Windows**. macOS/Linux alternatives are noted where they differ.

---

## Phase 1 — Detect Operating System

Run:
```
ver
```
- If output contains `Windows` → use Windows commands below.
- If output contains nothing or fails → try `uname -s` (macOS/Linux).

---

## Phase 2 — Install Python 3.11+

### Check if Python is already installed
```
python --version
```
- If output is `Python 3.11.x` or higher → **skip to Phase 3**.
- If output is `Python 3.9.x` or lower, or command not found → install Python.

### Install Python on Windows (via winget)
```
winget install -e --id Python.Python.3.11
```
After install, close and reopen the terminal, then verify:
```
python --version
```
Expected: `Python 3.11.x`

### Install Python on macOS (via Homebrew)
```
brew install python@3.11
```

### Install Python on Linux (Ubuntu/Debian)
```
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip
```

---

## Phase 3 — Install Node.js 20+ and npm

### Check if Node.js is already installed
```
node --version
```
- If output is `v20.x.x` or higher → **skip to Phase 4**.
- If lower or not found → install Node.js.

### Install Node.js on Windows (via winget)
```
winget install -e --id OpenJS.NodeJS.LTS
```
After install, close and reopen the terminal, then verify:
```
node --version
npm --version
```
Expected: `v20.x.x` and `9.x.x` or higher.

### Install Node.js on macOS
```
brew install node@20
```

### Install Node.js on Linux (Ubuntu/Debian)
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Phase 4 — Set Up Python Backend

### Step 4.1 — Navigate to backend directory
```
cd backend
```

### Step 4.2 — Create a Python virtual environment
```
python -m venv .venv
```
Expected: a `.venv` folder is created inside `backend/`.

### Step 4.3 — Activate the virtual environment

**Windows (Command Prompt or PowerShell):**
```
.venv\Scripts\activate
```

**macOS / Linux:**
```
source .venv/bin/activate
```

After activation, the terminal prompt should show `(.venv)`.

### Step 4.4 — Upgrade pip
```
python -m pip install --upgrade pip
```

### Step 4.5 — Install Python dependencies
```
pip install -r requirements.txt
```
This installs: FastAPI, Uvicorn, SQLAlchemy, Pydantic, python-jose, passlib, and all other packages listed in `requirements.txt`.

Verify key packages installed:
```
pip show fastapi uvicorn sqlalchemy pydantic python-jose passlib
```
Each should show `Name:` and `Version:` without errors.

### Step 4.6 — Seed the database
```
python seed.py
```
Expected output:
```
Created admin user (username=admin, password=admin123)
Seeded XX config items
Seed complete.
```
If it says `Admin user already exists — skipped`, the database was already seeded previously. That is fine.

This step creates:
- `backend/data/tracker.db` (SQLite database file)
- One admin user (username: `admin`, password: `admin123`)
- All default dropdown config items (expense categories, credit cards, etc.)

### Step 4.7 — Return to project root
```
cd ..
```

---

## Phase 5 — Set Up Frontend

### Step 5.1 — Navigate to frontend directory
```
cd frontend
```

### Step 5.2 — Install Node dependencies
```
npm install
```
This reads `package.json` and installs React, Vite, Tailwind, TanStack Query, Zustand, Axios, and all other frontend packages into the `node_modules/` folder.

Expected: ends with a line like `added XXX packages`.

### Step 5.3 — Return to project root
```
cd ..
```

---

## Phase 6 — Start the Application

### Option A — PowerShell scripts (Windows)

Two convenience scripts exist in the project root:

```powershell
.\start.ps1   # opens two terminal windows — backend on :8000, frontend on :5173
.\stop.ps1    # kills processes on ports 8000 and 5173
```

Run with: right-click → Run with PowerShell, or `.\start.ps1` from a PowerShell terminal.

### Option B — Manual (two separate terminals)

Two processes must run simultaneously. Start them in **two separate terminals**.

### Terminal 1 — Start Backend

```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**macOS / Linux:**
```
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Wait for this line in the output:
```
INFO:     Application startup complete.
```

Verify the backend is running by visiting: `http://localhost:8000/health`
Expected JSON response: `{"status": "ok", "app": "Expense & Asset Tracker"}`

API documentation (Swagger UI): `http://localhost:8000/docs`

### Terminal 2 — Start Frontend

```
cd frontend
npm run dev
```

Wait for this line in the output:
```
Local:   http://localhost:5173/
```

---

## Phase 7 — Verify Everything Works

Run these checks in order:

### Check 1 — Backend health
```
curl http://localhost:8000/health
```
Expected: `{"status":"ok","app":"Expense & Asset Tracker"}`

### Check 2 — Login API
```
curl -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```
**macOS / Linux:**
```
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Expected: a JSON response containing a `token` field.

### Check 3 — Frontend
Open browser at: `http://localhost:5173`
Expected: login page with "Expense Tracker" heading.

Login with:
- Username: `admin`
- Password: `admin123`

Expected after login: redirected to the Expenses page for the current month.

---

## Phase 8 — Troubleshooting

### "python not found" or "python3 not found"
Python is not in PATH. Re-run Phase 2. On Windows, ensure "Add Python to PATH" was checked during install.

### "pip install" fails with permission error
Add `--user` flag:
```
pip install --user -r requirements.txt
```

### "uvicorn not found" after activating venv
The venv was not activated correctly. Re-run Step 4.3 and confirm the prompt shows `(.venv)`.

### "npm install" fails with ERESOLVE
Run with legacy peer deps:
```
npm install --legacy-peer-deps
```

### Port 8000 already in use
Find and kill the process using port 8000:
```
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```
Then restart uvicorn.

### Port 5173 already in use
Vite will automatically try port 5174, 5175, etc. Check the terminal output for the actual URL.

### Frontend shows blank page or network errors
Confirm the backend is running on port 8000. The frontend proxies `/api` requests to `http://localhost:8000` via the Vite dev server config in `frontend/vite.config.ts`.

### Database file not found error
Run `python seed.py` from inside the `backend/` directory with the venv activated.

---

## Summary of URLs

| Service | URL |
|---|---|
| Frontend app | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger / API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

## Default Credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |
