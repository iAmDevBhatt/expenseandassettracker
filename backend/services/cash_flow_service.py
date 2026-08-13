from decimal import Decimal
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.cash_flow_rows import CASH_FLOW_ROWS, COMPUTED_ROW_KEYS
from models.cash_flow_entry import CashFlowEntry
from models.month_year import MonthYear
from schemas.cash_flow import CashFlowEntryOut, CashFlowBulkItem


def _build_out(row_key: str, amount: Decimal) -> CashFlowEntryOut:
    row_def = CASH_FLOW_ROWS[row_key]
    return CashFlowEntryOut(
        row_key=row_key,
        label=row_def.label,
        amount=amount,
        computed=row_def.computed,
        sort_order=row_def.sort_order,
    )


def get_cash_flow(month_year: MonthYear, spent_via_cc: Decimal, spent: Decimal, db: Session) -> List[CashFlowEntryOut]:
    entries = (
        db.query(CashFlowEntry)
        .filter_by(month_year_id=month_year.id)
        .order_by(CashFlowEntry.sort_order.asc())
        .all()
    )
    entry_map = {e.row_key: e.manual_amount or Decimal("0") for e in entries}

    result = []
    for row_key, row_def in CASH_FLOW_ROWS.items():
        if row_def.computed:
            amount = spent_via_cc if row_key == "SPENT_VIA_CC" else spent
        else:
            amount = entry_map.get(row_key, Decimal("0"))
        result.append(_build_out(row_key, amount))

    return sorted(result, key=lambda r: r.sort_order)


def update_row(month_year: MonthYear, row_key: str, amount: Decimal, db: Session) -> CashFlowEntryOut:
    if row_key not in CASH_FLOW_ROWS:
        raise HTTPException(status_code=404, detail=f"Unknown row_key: {row_key}")
    if CASH_FLOW_ROWS[row_key].computed:
        raise HTTPException(status_code=400, detail=f"{row_key} is a computed row and cannot be edited")

    entry = db.query(CashFlowEntry).filter_by(month_year_id=month_year.id, row_key=row_key).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Cash flow entry not found for this month")

    entry.manual_amount = amount
    db.commit()
    return _build_out(row_key, amount)


def bulk_update(month_year: MonthYear, items: List[CashFlowBulkItem], db: Session) -> List[CashFlowEntryOut]:
    results = []
    for item in items:
        results.append(update_row(month_year, item.row_key, item.amount, db))
    return results
