import api from './axiosInstance'
import type { Expense, ExpenseCreate, ExpenseUpdate } from '../types'

export const listExpenses = async (monthYearId: number): Promise<Expense[]> => {
  const { data } = await api.get<Expense[]>(`/api/months/${monthYearId}/expenses`)
  return data
}

export const createExpense = async (monthYearId: number, payload: ExpenseCreate): Promise<Expense> => {
  const { data } = await api.post<Expense>(`/api/months/${monthYearId}/expenses`, payload)
  return data
}

export const updateExpense = async (id: number, payload: ExpenseUpdate): Promise<Expense> => {
  const { data } = await api.put<Expense>(`/api/expenses/${id}`, payload)
  return data
}

export const deleteExpense = async (id: number): Promise<void> => {
  await api.delete(`/api/expenses/${id}`)
}
