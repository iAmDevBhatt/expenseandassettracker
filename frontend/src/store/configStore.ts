import { create } from 'zustand'
import type { AllConfigs } from '../types'
import { getAllConfigs } from '../api/configApi'

interface ConfigState {
  configs: AllConfigs | null
  loading: boolean
  fetchConfigs: () => Promise<void>
  invalidate: () => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  configs: null,
  loading: false,

  fetchConfigs: async () => {
    set({ loading: true })
    try {
      const configs = await getAllConfigs()
      set({ configs, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  invalidate: () => set({ configs: null }),
}))
