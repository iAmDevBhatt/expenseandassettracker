import api from './axiosInstance'
import type { AssetBlueprint } from '../types'

export const listAssetBlueprints = () =>
  api.get<AssetBlueprint[]>('/api/asset-blueprints').then(r => r.data)

export const createAssetBlueprint = (data: {
  name: string
  asset_category?: string | null
  asset_sub_category?: string | null
  asset_holder?: string | null
  account_number?: string | null
  sort_order?: number
}) => api.post<AssetBlueprint>('/api/asset-blueprints', data).then(r => r.data)

export const updateAssetBlueprint = (id: number, data: Partial<{
  name: string
  asset_category: string | null
  asset_sub_category: string | null
  asset_holder: string | null
  account_number: string | null
  sort_order: number
}>) => api.put<AssetBlueprint>(`/api/asset-blueprints/${id}`, data).then(r => r.data)

export const deleteAssetBlueprint = (id: number) =>
  api.delete(`/api/asset-blueprints/${id}`)
