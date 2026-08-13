export interface User {
  id: number
  username: string
}

export interface LoginResponse {
  token: string
  expires_in: number
  username: string
}

export interface MonthYear {
  id: number
  year: number
  month: number
  created_at: string
}

export interface Expense {
  id: number
  expense_date: string
  amount: number
  description: string | null
  amount_cc: number | null
  paid_via_cc: string | null
  category: string
  created_at: string
  updated_at: string
}

export interface ExpenseCreate {
  expense_date: string
  amount: number
  description?: string
  paid_via_cc?: string | null
  category: string
}

export interface ExpenseUpdate {
  expense_date?: string
  amount?: number
  description?: string | null
  paid_via_cc?: string | null
  category?: string
}

export interface CashFlowEntry {
  row_key: string
  label: string
  amount: number
  computed: boolean
  sort_order: number
}

export interface ConfigItem {
  id: number
  list_type: string
  value: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface AllConfigs {
  EXPENSE_CATEGORY: ConfigItem[]
  CREDIT_CARD: ConfigItem[]
  MONTHLY_MUST: ConfigItem[]
  TOTALLY_ESSENTIAL: ConfigItem[]
  ASSET_CATEGORY: ConfigItem[]
  ASSET_HOLDER: ConfigItem[]
  ASSET_SUB_CATEGORY: ConfigItem[]
  IGNORE_CATEGORY: ConfigItem[]
  [key: string]: ConfigItem[]
}

export interface CategoryRow {
  category: string
  amount: number
}

export interface FinancialSummary {
  income: number
  spent_minus_investment: number
  investment: number
  ignore: number
  open: number
}

export interface Dashboard {
  category_summary: CategoryRow[]
  cash_flow: CashFlowEntry[]
  financial_summary: FinancialSummary
}

export interface Asset {
  id: number
  asset_category: string | null
  asset_holder: string | null
  asset_sub_category: string | null
  name: string | null
  current_value: number | null
  notes: string | null
  as_of_date: string | null
  created_at: string
  updated_at: string
}
