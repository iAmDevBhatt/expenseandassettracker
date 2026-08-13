"""
One-time migration: adds fy_start_year column to asset_monthly_values.
Safe to re-run — idempotent.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    cols = [row[1] for row in conn.execute(text("PRAGMA table_info(asset_monthly_values)"))]
    if "fy_start_year" not in cols:
        conn.execute(text(
            "ALTER TABLE asset_monthly_values ADD COLUMN fy_start_year INTEGER NOT NULL DEFAULT 2025"
        ))
        conn.commit()
        print("Migration complete: added fy_start_year (default 2025) to asset_monthly_values")
    else:
        print("Already migrated: fy_start_year column already exists")
