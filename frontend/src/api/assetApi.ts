import api from './axiosInstance'
import type {
  AssetWithMonthly,
  ProtectionTarget,
  LiquidAsset,
  PreciousMetal,
  MetalPrice,
} from '../types'

// Assets
export const listAssets = () =>
  api.get<AssetWithMonthly[]>('/api/assets').then(r => r.data)

export const createAsset = (data: {
  asset_category?: string | null
  asset_sub_category?: string | null
  asset_holder?: string | null
  account_number?: string | null
  name?: string | null
  notes?: string | null
  current_value?: number | null
  as_of_date?: string | null
}) => api.post<AssetWithMonthly>('/api/assets', data).then(r => r.data)

export const updateAsset = (id: number, data: Partial<{
  asset_category: string | null
  asset_sub_category: string | null
  asset_holder: string | null
  account_number: string | null
  name: string | null
  notes: string | null
  current_value: number | null
  as_of_date: string | null
}>) => api.put<AssetWithMonthly>(`/api/assets/${id}`, data).then(r => r.data)

export const deleteAsset = (id: number) =>
  api.delete(`/api/assets/${id}`)

// Monthly values
export const upsertMonthlyValue = (assetId: number, monthKey: string, amount: number | null, fyStartYear: number) =>
  api.put(`/api/assets/${assetId}/monthly/${fyStartYear}/${monthKey}`, { amount }).then(r => r.data)

export const deleteMonthlyValue = (assetId: number, monthKey: string, fyStartYear: number) =>
  api.delete(`/api/assets/${assetId}/monthly/${fyStartYear}/${monthKey}`)

// Protection targets — returns empty array if not yet set up
export const listProtectionTargets = (): Promise<ProtectionTarget[]> =>
  api.get<ProtectionTarget[]>('/api/assets/protection-targets').then(r => r.data)

export const initProtectionTargets = (): Promise<ProtectionTarget[]> =>
  api.post<ProtectionTarget[]>('/api/assets/protection-targets/init').then(r => r.data)

export const updateProtectionTarget = (id: number, data: {
  current_value?: number | null
  target_value?: number | null
}) => api.put<ProtectionTarget>(`/api/assets/protection-targets/${id}`, data).then(r => r.data)

// Liquid asset — returns null if not yet set up
export const getLiquidAsset = async (): Promise<LiquidAsset | null> => {
  try {
    return await api.get<LiquidAsset>('/api/assets/liquid-asset').then(r => r.data)
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export const initLiquidAsset = (): Promise<LiquidAsset> =>
  api.post<LiquidAsset>('/api/assets/liquid-asset/init').then(r => r.data)

export const updateLiquidAsset = (data: Partial<{
  current_fixed: number | null
  current_savings: number | null
  current_cash: number | null
  target_fixed: number | null
  target_savings: number | null
  target_cash: number | null
}>) => api.put<LiquidAsset>('/api/assets/liquid-asset', data).then(r => r.data)

// Precious metals
export const listPreciousMetals = () =>
  api.get<PreciousMetal[]>('/api/assets/precious-metals').then(r => r.data)

export const createPreciousMetal = (data: Partial<Omit<PreciousMetal, 'id'>>) =>
  api.post<PreciousMetal>('/api/assets/precious-metals', data).then(r => r.data)

export const updatePreciousMetal = (id: number, data: Partial<Omit<PreciousMetal, 'id'>>) =>
  api.put<PreciousMetal>(`/api/assets/precious-metals/${id}`, data).then(r => r.data)

export const deletePreciousMetal = (id: number) =>
  api.delete(`/api/assets/precious-metals/${id}`)

export const getMetalPrice = (metal: string) =>
  api.get<MetalPrice>(`/api/assets/metal-price/${metal}`).then(r => r.data)
