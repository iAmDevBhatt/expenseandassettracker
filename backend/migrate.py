"""
Idempotent schema migrations.

The Docker entrypoint runs this before the app starts:

    python migrate.py && python seed.py && uvicorn main:app ...

Contract for everything in this file:

  * NON-DESTRUCTIVE ONLY. Add tables, add columns, add indexes, backfill data.
    Never DROP or rename a column/table in the same release that stops using it —
    do that one release later, after you are sure nothing reads it.
  * IDEMPOTENT. Every step checks the current schema first and no-ops if it is
    already applied, so it is safe to run on every single deploy.
  * Brand-new tables need NO entry here — `Base.metadata.create_all()` (called at
    the top of run(), and again by seed.py / main.py) creates them automatically.
    You only add a migration when you change an EXISTING table.

To add a migration: write a guarded function and append it to MIGRATIONS.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import inspect, text

from database import engine, Base
import models  # noqa: F401  — registers every model on Base.metadata


# ── helpers ──────────────────────────────────────────────────────────────────
def _tables(conn) -> set[str]:
    return set(inspect(conn).get_table_names())


def _columns(conn, table: str) -> set[str]:
    return {c["name"] for c in inspect(conn).get_columns(table)}


def _indexes(conn, table: str) -> set[str]:
    return {ix["name"] for ix in inspect(conn).get_indexes(table)}


# ── migrations ───────────────────────────────────────────────────────────────
def m_0001_asset_monthly_values_fy_start_year(conn) -> str:
    """Add fy_start_year to asset_monthly_values (was backend/migrate_monthly_year.py)."""
    table = "asset_monthly_values"
    if table not in _tables(conn):
        return "skipped — table not present"
    if "fy_start_year" in _columns(conn, table):
        return "already applied"
    conn.execute(text(
        f"ALTER TABLE {table} ADD COLUMN fy_start_year INTEGER NOT NULL DEFAULT 2025"
    ))
    return f"added {table}.fy_start_year (default 2025)"


# Register migrations in run order. Keep the numeric prefixes monotonic.
#
# Template for a future "add a column" migration:
#
#   def m_0002_expenses_add_tag(conn) -> str:
#       if "tag" in _columns(conn, "expenses"):
#           return "already applied"
#       conn.execute(text("ALTER TABLE expenses ADD COLUMN tag VARCHAR(100)"))
#       return "added expenses.tag"
#
MIGRATIONS = [
    ("0001_asset_monthly_values_fy_start_year", m_0001_asset_monthly_values_fy_start_year),
]


def run() -> None:
    # 1. Create any brand-new tables so migrations can rely on them existing.
    Base.metadata.create_all(bind=engine)

    # 2. Apply each existing-table migration inside one transaction.
    print(f"[migrate] {len(MIGRATIONS)} migration(s) registered")
    with engine.begin() as conn:
        for name, fn in MIGRATIONS:
            try:
                result = fn(conn) or "ok"
            except Exception as exc:  # noqa: BLE001 — surface and abort the deploy
                print(f"[migrate] {name}: FAILED — {exc}")
                raise
            print(f"[migrate] {name}: {result}")
    print("[migrate] done")


if __name__ == "__main__":
    run()
