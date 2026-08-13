import api from './axiosInstance'
import type { MonthYear } from '../types'

export const listMonths = async (): Promise<MonthYear[]> => {
  const { data } = await api.get<MonthYear[]>('/api/months')
  return data
}

export const getOrCreateMonth = async (year: number, month: number): Promise<MonthYear> => {
  const { data } = await api.get<MonthYear>(`/api/months/${year}/${month}`)
  return data
}

export const checkMonth = async (year: number, month: number): Promise<MonthYear | null> => {
  try {
    const { data } = await api.get<MonthYear>(`/api/months/${year}/${month}/check`)
    return data
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export const createMonth = async (year: number, month: number): Promise<MonthYear> => {
  const { data } = await api.post<MonthYear>(`/api/months/${year}/${month}`)
  return data
}

export const deleteMonth = async (id: number): Promise<void> => {
  await api.delete(`/api/months/${id}`)
}
