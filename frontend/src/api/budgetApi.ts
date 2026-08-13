import api from './axiosInstance'
import type {
  BudgetEntry,
  BudgetEntryUpsert,
  ActualsResponse,
  MonthBreakdownItem,
  MonthlySummaryItem,
  BudgetSummary,
} from '../types'

export const getBudgetEntries = async (fyStartYear: number): Promise<BudgetEntry[]> => {
  const { data } = await api.get<BudgetEntry[]>(`/api/budget/${fyStartYear}/entries`)
  return data
}

export const saveBudgetEntries = async (
  fyStartYear: number,
  entries: BudgetEntryUpsert[],
): Promise<BudgetEntry[]> => {
  const { data } = await api.put<BudgetEntry[]>(`/api/budget/${fyStartYear}/entries`, {
    fy_start_year: fyStartYear,
    entries,
  })
  return data
}

export const getBudgetActuals = async (
  fyStartYear: number,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Promise<ActualsResponse> => {
  const { data } = await api.get<ActualsResponse>(`/api/budget/${fyStartYear}/actuals`, {
    params: { start_year: startYear, start_month: startMonth, end_year: endYear, end_month: endMonth },
  })
  return data
}

export const getMonthlyBreakdown = async (fyStartYear: number): Promise<MonthBreakdownItem[]> => {
  const { data } = await api.get<MonthBreakdownItem[]>(`/api/budget/${fyStartYear}/monthly-breakdown`)
  return data
}

export const getMonthlySummary = async (fyStartYear: number): Promise<MonthlySummaryItem[]> => {
  const { data } = await api.get<MonthlySummaryItem[]>(`/api/budget/${fyStartYear}/monthly-summary`)
  return data
}

export const getBudgetSummary = async (fyStartYear: number): Promise<BudgetSummary> => {
  const { data } = await api.get<BudgetSummary>(`/api/budget/${fyStartYear}/summary`)
  return data
}

export const saveBudgetSummary = async (
  fyStartYear: number,
  payload: Partial<BudgetSummary>,
): Promise<BudgetSummary> => {
  const { data } = await api.put<BudgetSummary>(`/api/budget/${fyStartYear}/summary`, payload)
  return data
}
