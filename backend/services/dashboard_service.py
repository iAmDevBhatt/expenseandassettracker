from decimal import Decimal
from sqlalchemy.orm import Session

from core.cash_flow_rows import INCOME_ROW_KEYS, CASH_FLOW_ROWS
from models.cash_flow_entry import CashFlowEntry
from models.month_year import MonthYear
from schemas.dashboard import DashboardOut, CategoryRow, FinancialSummary
from services import expense_service, cash_flow_service, config_service


def get_dashboard(month_year: MonthYear, db: Session) -> DashboardOut:
    spent_via_cc = expense_service.sum_amount_cc(month_year, db)
    total_amount = expense_service.sum_amount(month_year, db)
    spent = total_amount - spent_via_cc

    cash_flow_rows = cash_flow_service.get_cash_flow(month_year, spent_via_cc, spent, db)

    cf_map = {row.row_key: row.amount for row in cash_flow_rows}
    income = sum(cf_map.get(k, Decimal("0")) for k in INCOME_ROW_KEYS)

    investment = expense_service.sum_by_category_value(month_year, "Investment", db)

    ignore_categories = config_service.get_values_by_list_type("IGNORE_CATEGORY", db)
    ignore = expense_service.sum_by_categories(month_year, ignore_categories, db)

    spent_total = spent_via_cc + spent
    spent_minus_inv = spent_total - investment - ignore
    open_amount = income - spent_minus_inv - investment

    category_summary = expense_service.sum_by_all_categories(month_year, db)

    return DashboardOut(
        category_summary=[CategoryRow(**r) for r in category_summary],
        cash_flow=cash_flow_rows,
        financial_summary=FinancialSummary(
            income=income,
            spent_minus_investment=spent_minus_inv,
            investment=investment,
            ignore=ignore,
            open=open_amount,
        ),
    )
