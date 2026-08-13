from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class CashFlowRowDef:
    sort_order: int
    label: str
    computed: bool


CASH_FLOW_ROWS: Dict[str, CashFlowRowDef] = {
    "NET_SALARY":              CashFlowRowDef(1,  "Net Salary",                            False),
    "RENT_2BHK":               CashFlowRowDef(2,  "2bhk Rent",                             False),
    "RENT_1BHK":               CashFlowRowDef(3,  "1bhk Rent",                             False),
    "TEJAS":                   CashFlowRowDef(4,  "Tejas",                                 False),
    "INTEREST_SBI":            CashFlowRowDef(5,  "SBI (Bank interest)",                   False),
    "INTEREST_HDFC_1":         CashFlowRowDef(6,  "HDFC 50100512001064 (Bank interest)",   False),
    "INTEREST_HDFC_2":         CashFlowRowDef(7,  "HDFC 50100164914736 (Bank interest)",   False),
    "INTEREST_PNB_1":          CashFlowRowDef(8,  "PNB 0408010147770 (Bank interest)",     False),
    "INTEREST_PNB_2":          CashFlowRowDef(9,  "PNB 0408010244121 (Bank interest)",     False),
    "DIVIDENDS":               CashFlowRowDef(10, "Dividends",                             False),
    "INCOME_INVESTMENTS":      CashFlowRowDef(11, "Income from Investments",               False),
    "TAX_DEDUCTED":            CashFlowRowDef(12, "Tax Deducted From Salary",              False),
    "PF_DEDUCTED":             CashFlowRowDef(13, "PF Deducted",                           False),
    "PROFESSIONAL_TAX":        CashFlowRowDef(14, "Professional Tax",                      False),
    "GROSS_SALARY":            CashFlowRowDef(15, "Gross Salary",                          False),
    "INVESTMENT_ACTIVITY":     CashFlowRowDef(16, "Investment Activity",                   False),
    "NET_INCOME_APART_SALARY": CashFlowRowDef(17, "Net Income apart from salary",          False),
    "NET_TOTAL_INCOME":        CashFlowRowDef(18, "Net total income",                      False),
    "REMAINING":               CashFlowRowDef(19, "Remaining",                             False),
    "HDFC_CURR_ACCOUNT":       CashFlowRowDef(20, "HDFC CurrAccount",                      False),
    "HDFC_ANOTHER_ACCOUNT":    CashFlowRowDef(21, "HDFC Another Account",                  False),
    "SBI_ACCOUNT":             CashFlowRowDef(22, "SBI",                                   False),
    "UNITED_BANK":             CashFlowRowDef(23, "United bank",                           False),
    "SPENT_VIA_CC":            CashFlowRowDef(24, "Spent via CreditCard",                  True),
    "SPENT":                   CashFlowRowDef(25, "Spent",                                 True),
}

EDITABLE_ROW_KEYS = [k for k, v in CASH_FLOW_ROWS.items() if not v.computed]
COMPUTED_ROW_KEYS = [k for k, v in CASH_FLOW_ROWS.items() if v.computed]

INCOME_ROW_KEYS = [
    "NET_SALARY",
    "RENT_2BHK", "RENT_1BHK", "TEJAS",
    "INTEREST_SBI", "INTEREST_HDFC_1", "INTEREST_HDFC_2",
    "INTEREST_PNB_1", "INTEREST_PNB_2",
    "DIVIDENDS", "INCOME_INVESTMENTS",
]
