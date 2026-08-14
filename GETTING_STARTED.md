# Getting Started

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| Python | 3.11+ (tested up to 3.14) | https://www.python.org/downloads/ |
| Node.js | 20+ | https://nodejs.org/ |
| npm | 9+ | Included with Node.js |

---

## First-Time Setup

### 1. Backend

Open a terminal in the project root and run:

```bash
cd backend

# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Seed the database (creates admin user + all default config items)
python seed.py
```

### 2. Frontend

Open a second terminal in the project root and run:

```bash
cd frontend

# Install Node dependencies
npm install
```

---

## Starting the App (every time)

### Option A — One-click scripts (Windows, recommended)

From the project root, right-click the file and choose **Run with PowerShell**, or run from a terminal:

```powershell
.\start.ps1   # opens two terminal windows: backend + frontend
.\stop.ps1    # kills whatever is running on ports 8000 and 5173
```

### Option B — Manual (two terminals)

### Terminal 1 — Backend

```bash
cd backend
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

uvicorn main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`
Swagger / API docs: `http://localhost:8000/docs`

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## Login

Open `http://localhost:5173` in your browser.

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> **Note:** Change your password after first login for security.

---

## Stopping the App

Press `Ctrl + C` in each terminal to stop the backend and frontend servers.

---

## Changing UI Labels

All screen text (button labels, headings, form fields, error messages) is stored in one file:

```
frontend/public/labels.properties
```

Open it in any text editor, change a value, and reload the browser — no restart or rebuild needed.

---

## Optional: Switch to PostgreSQL

By default the app uses SQLite (no setup needed). To use PostgreSQL instead:

1. Create a PostgreSQL database named `trackerdb`
2. Install the PostgreSQL driver (not included by default — see the comment in `requirements.txt`):

```bash
pip install psycopg2-binary
# If that fails on your Python version, try:
# pip install psycopg[binary]
```

3. Set the environment variable before starting the backend:

```bash
# Windows (Command Prompt)
set DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/trackerdb

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://your_user:your_pass@localhost:5432/trackerdb"

# macOS / Linux
export DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/trackerdb
```

4. Start the backend normally — SQLAlchemy will create all tables automatically on first run.

Alternatively, copy `backend/.env.example` to `backend/.env` and edit the `DATABASE_URL` line.

---

## Option C — Docker (single container, production)

### Prerequisites
- Docker (and optionally Docker Compose) installed on the target machine.

### Quick test (local)

```bash
# From the project root
docker build -t expenseandassettracker .
docker run -p 8000:8000 -v tracker_data:/app/data expenseandassettracker
```

Open `http://localhost:8000` — the full app is served from a single container.

### Production deployment (docker-compose)

The recommended production layout places `docker-compose.yml` one level above the git clone:

```
/opt/blr-stack/
├── docker-compose.yml          ← copy from the repo (or keep here after git pull)
└── expenseandassettracker/     ← git clone lives here
```

Steps:

```bash
# Clone the repo
cd /opt/blr-stack
git clone <repo-url> expenseandassettracker

# Copy docker-compose.yml one level up
cp expenseandassettracker/docker-compose.yml .

# Edit JWT_SECRET before deploying (required for production security)
nano docker-compose.yml

# Start
docker-compose up -d
```

The app will be available at `http://<server-ip>:8000`.

To update after a `git pull`:

```bash
cd /opt/blr-stack
docker-compose build --no-cache
docker-compose up -d
```

The SQLite database is stored in a named Docker volume (`tracker_data`) and survives container rebuilds.

---

## Production Build (non-Docker)

To build the frontend for production:

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`. Serve this folder with any static file server (nginx, Caddy, etc.) alongside the FastAPI backend.

To run the backend without auto-reload in production:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```
