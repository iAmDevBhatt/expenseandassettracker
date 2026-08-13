import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PreciousMetal } from '../../types'
import {
  createPreciousMetal,
  updatePreciousMetal,
  deletePreciousMetal,
  getMetalPrice,
} from '../../api/assetApi'
import { useLabels } from '../../hooks/useLabels'

const METAL_TYPES = ['Gold', 'Silver', 'Gold Bar']
const CARAT_OPTIONS = ['24K', '22K', '18K', '14K', '9999', 'n/a']
const METAL_PRICE_KEY_MAP: Record<string, string> = {
  Gold: 'gold',
  Silver: 'silver',
  'Gold Bar': 'gold_bar',
}

interface Props {
  metals: PreciousMetal[]
}

type EditingMap = Record<string, string>

export default function PreciousMetalsTable({ metals }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<EditingMap>({})

  // Fetch live gold/silver prices (if any metals present)
  const uniqueMetalTypes = [...new Set(metals.map(m => m.metal_type).filter(Boolean) as string[])]
  const priceQueries = useQuery({
    queryKey: ['metal-prices', uniqueMetalTypes.join(',')],
    queryFn: async () => {
      const results: Record<string, number | null> = {}
      await Promise.all(
        uniqueMetalTypes.map(mt =>
          getMetalPrice(METAL_PRICE_KEY_MAP[mt] ?? mt.toLowerCase())
            .then(r => { results[mt] = r.price_per_gram })
            .catch(() => { results[mt] = null })
        )
      )
      return results
    },
    staleTime: 5 * 60 * 1000,
    enabled: uniqueMetalTypes.length > 0,
  })

  const createMut = useMutation({
    mutationFn: createPreciousMetal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['precious-metals'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<PreciousMetal, 'id'>> }) =>
      updatePreciousMetal(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['precious-metals'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deletePreciousMetal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['precious-metals'] }),
  })

  const eKey = (id: number, field: string) => `${id}_${field}`

  const getVal = (metal: PreciousMetal, field: keyof PreciousMetal) => {
    const k = eKey(metal.id, field)
    return k in editing ? editing[k] : String(metal[field] ?? '')
  }

  const handleChange = (id: number, field: string, value: string) =>
    setEditing(prev => ({ ...prev, [eKey(id, field)]: value }))

  const handleBlur = (metal: PreciousMetal, field: keyof PreciousMetal) => {
    const k = eKey(metal.id, field)
    if (!(k in editing)) return
    const raw = editing[k]
    let value: any = raw === '' ? null : raw
    if (['grams', 'purchase_price', 'amount_spent', 'current_value_override'].includes(field)) {
      value = raw === '' ? null : Number(raw)
    }
    updateMut.mutate({ id: metal.id, data: { [field]: value } })
    setEditing(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const computedCurrentValue = (metal: PreciousMetal) => {
    if (metal.current_value_override != null) return metal.current_value_override
    const priceMap = priceQueries.data ?? {}
    const pricePerGram = metal.metal_type ? priceMap[metal.metal_type] : null
    if (pricePerGram != null && metal.grams != null) {
      return Number((pricePerGram * Number(metal.grams)).toFixed(2))
    }
    return null
  }

  const fmt = (v: number | null) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  const priceLabel = (metal: PreciousMetal) => {
    const priceMap = priceQueries.data ?? {}
    if (!metal.metal_type) return null
    const p = priceMap[metal.metal_type]
    if (p == null) return '(live price unavailable)'
    return `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/g`
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-700">
          {l('asset.metals.title', 'Precious Metals')}
        </h3>
        <button
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => createMut.mutate({})}
        >
          + {l('asset.metals.add', 'Add Row')}
        </button>
      </div>

      {priceQueries.data && uniqueMetalTypes.length > 0 && (
        <div className="flex gap-4 mb-2 text-xs text-gray-500">
          {uniqueMetalTypes.map(mt => (
            <span key={mt}>
              {mt}: {priceQueries.data[mt] != null
                ? `₹${Number(priceQueries.data[mt]).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/g`
                : 'live price unavailable'}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{l('asset.metals.col.type', 'Metal Type')}</th>
              <th className="px-3 py-2 text-left font-medium">{l('asset.metals.col.carat', 'Carat')}</th>
              <th className="px-3 py-2 text-right font-medium">{l('asset.metals.col.grams', 'Grams')}</th>
              <th className="px-3 py-2 text-right font-medium">{l('asset.metals.col.purchase', 'Purchase Price (₹)')}</th>
              <th className="px-3 py-2 text-right font-medium">{l('asset.metals.col.spent', 'Amount Spent (₹)')}</th>
              <th className="px-3 py-2 text-right font-medium">{l('asset.metals.col.current', 'Current Value (₹)')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {metals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                  {l('asset.metals.empty', 'No precious metals added yet.')}
                </td>
              </tr>
            )}
            {metals.map((m, i) => {
              const computedVal = computedCurrentValue(m)
              const isOverride = m.current_value_override != null
              return (
                <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Metal Type */}
                  <td className="px-2 py-1">
                    <select
                      className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={getVal(m, 'metal_type')}
                      onChange={e => handleChange(m.id, 'metal_type', e.target.value)}
                      onBlur={() => handleBlur(m, 'metal_type')}
                    >
                      <option value="">— Select —</option>
                      {METAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  {/* Carat */}
                  <td className="px-2 py-1">
                    <select
                      className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={getVal(m, 'carat')}
                      onChange={e => handleChange(m.id, 'carat', e.target.value)}
                      onBlur={() => handleBlur(m, 'carat')}
                    >
                      <option value="">—</option>
                      {CARAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  {/* Grams */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.0001"
                      className="w-24 text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={getVal(m, 'grams')}
                      placeholder="—"
                      onChange={e => handleChange(m.id, 'grams', e.target.value)}
                      onFocus={() => setEditing(prev => ({ ...prev, [eKey(m.id, 'grams')]: String(m.grams ?? '') }))}
                      onBlur={() => handleBlur(m, 'grams')}
                    />
                  </td>
                  {/* Purchase price */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-28 text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={getVal(m, 'purchase_price')}
                      placeholder="—"
                      onChange={e => handleChange(m.id, 'purchase_price', e.target.value)}
                      onFocus={() => setEditing(prev => ({ ...prev, [eKey(m.id, 'purchase_price')]: String(m.purchase_price ?? '') }))}
                      onBlur={() => handleBlur(m, 'purchase_price')}
                    />
                  </td>
                  {/* Amount spent */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-28 text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={getVal(m, 'amount_spent')}
                      placeholder="—"
                      onChange={e => handleChange(m.id, 'amount_spent', e.target.value)}
                      onFocus={() => setEditing(prev => ({ ...prev, [eKey(m.id, 'amount_spent')]: String(m.amount_spent ?? '') }))}
                      onBlur={() => handleBlur(m, 'amount_spent')}
                    />
                  </td>
                  {/* Current value */}
                  <td className="px-2 py-1">
                    <div className="flex flex-col items-end gap-0.5">
                      <input
                        type="number"
                        className={`w-28 text-right border rounded px-1 py-0.5 bg-transparent focus:outline-none ${
                          isOverride ? 'border-amber-400 bg-amber-50' : 'border-transparent hover:border-gray-300 focus:border-blue-400'
                        }`}
                        value={getVal(m, 'current_value_override')}
                        placeholder={computedVal != null ? fmt(computedVal) : '—'}
                        onChange={e => handleChange(m.id, 'current_value_override', e.target.value)}
                        onFocus={() => setEditing(prev => ({ ...prev, [eKey(m.id, 'current_value_override')]: String(m.current_value_override ?? '') }))}
                        onBlur={() => handleBlur(m, 'current_value_override')}
                        title={isOverride ? 'Manual override (live price ignored)' : 'Auto-calculated from live price × grams'}
                      />
                      {m.metal_type && (
                        <span className="text-xs text-gray-400">{priceLabel(m)}</span>
                      )}
                    </div>
                  </td>
                  {/* Delete */}
                  <td className="px-2 py-1 text-center">
                    <button
                      className="text-red-400 hover:text-red-600 text-xs"
                      onClick={() => { if (confirm('Delete this row?')) deleteMut.mutate(m.id) }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {l('asset.metals.hint', 'Current Value is auto-calculated (live price × grams). Enter a manual override if the live price is unavailable (shown in amber).')}
      </p>
    </div>
  )
}
