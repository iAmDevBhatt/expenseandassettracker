# ── Stage 1: Build the React frontend ────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN chmod +x node_modules/.bin/* && npm run build
# Output: /app/frontend/dist/

# ── Stage 2: Python runtime ───────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy compiled React app so FastAPI can serve it in SERVE_STATIC mode
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Persistent SQLite database lives here (mount a volume in production)
VOLUME /app/data

ENV DATABASE_URL="sqlite:////app/data/tracker.db"
ENV SERVE_STATIC="true"
ENV PORT=8000

EXPOSE 8000

# Seed the DB on first run (idempotent), then start the server
CMD ["sh", "-c", "cd /app/backend && python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
