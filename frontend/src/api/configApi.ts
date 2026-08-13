import api from './axiosInstance'
import type { AllConfigs, ConfigItem } from '../types'

export const getAllConfigs = async (): Promise<AllConfigs> => {
  const { data } = await api.get<AllConfigs>('/api/config')
  return data
}

export const getConfigByType = async (listType: string): Promise<ConfigItem[]> => {
  const { data } = await api.get<ConfigItem[]>(`/api/config/${listType}`)
  return data
}

export const addConfigItem = async (listType: string, value: string): Promise<ConfigItem> => {
  const { data } = await api.post<ConfigItem>(`/api/config/${listType}`, { value })
  return data
}

export const updateConfigItem = async (
  listType: string,
  id: number,
  value: string,
  sort_order: number,
): Promise<ConfigItem> => {
  const { data } = await api.put<ConfigItem>(`/api/config/${listType}/${id}`, { value, sort_order })
  return data
}

export const deleteConfigItem = async (listType: string, id: number): Promise<void> => {
  await api.delete(`/api/config/${listType}/${id}`)
}
