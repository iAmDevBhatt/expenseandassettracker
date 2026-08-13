import api from './axiosInstance'
import type { Dashboard } from '../types'

export const getDashboard = async (monthYearId: number): Promise<Dashboard> => {
  const { data } = await api.get<Dashboard>(`/api/months/${monthYearId}/dashboard`)
  return data
}
