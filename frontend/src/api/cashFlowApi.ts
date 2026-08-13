import api from './axiosInstance'
import type { CashFlowEntry } from '../types'

export const getCashFlow = async (monthYearId: number): Promise<CashFlowEntry[]> => {
  const { data } = await api.get<CashFlowEntry[]>(`/api/months/${monthYearId}/cashflow`)
  return data
}

export const updateCashFlowRow = async (
  monthYearId: number,
  rowKey: string,
  amount: number,
): Promise<CashFlowEntry> => {
  const { data } = await api.put<CashFlowEntry>(
    `/api/months/${monthYearId}/cashflow/${rowKey}`,
    { amount },
  )
  return data
}
