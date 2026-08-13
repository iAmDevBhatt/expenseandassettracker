import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AssetWithMonthly } from '../../types'
import { MONTH_KEYS, MONTH_LABELS, type MonthKey, type FYInfo } from '../../utils/financialYear'
import {
  createAsset,
  updateAsset,
  deleteAsset,
  upsertMonthlyValue,
} from '../../api/assetApi'
import { useLabels } from '../../hooks/useLabels'
import { useConfigStore } from '../../store/configStore'

interface Props {
  assets: AssetWithMonthly[]
  fy: FYInfo
  fyStartYear: number
}

type CellKey = string

export default function AssetDetailsTable({ assets, fy, fyStartYear }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const { configs } = useConfigStore()
  const [editing, setEditing] = useState<Record<CellKey, string>>({})

  const categories = configs?.ASSET_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const subCategories = configs?.ASSET_SUB_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const holders = configs?.ASSET_HOLDER?.filter(c => c.is_active).map(c => c.value) ?? []

  const createMut = useMutation({
    mutationFn: () => createAsset({}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateAsset>[1] }) =>
      updateAsset(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const monthMut = useMutation({
    mutationFn: ({ assetId, monthKey, amount }: { assetId: number; monthKey: string; amount: number | null }) =>
      upsertMonthlyValue(assetId, monthKey, amount, fyStartYear),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const ck = (id: number, field: string) => `${id}_${field}`

  const getVal = (asset: AssetWithMonthly, field: string) => {
    const k = ck(asset.id, field)
    if (k in editing) return editing[k]
    const v = (asset as any)[field]
    return v != null ? String(v) : ''
  }

  const getMonthVal = (asset: AssetWithMonthly, mk: MonthKey) => {
    const k = ck(asset.id, `month_${mk}`)
    if (k in editing) return editing[k]
    const mv = asset.monthly_values.find(m => m.month_key === mk && m.fy_start_year === fyStartYear)
    return mv?.amount != null ? String(mv.amount) : ''
  }

  const commitField = (asset: AssetWithMonthly, field: string) => {
    const k = ck(asset.id, field)
    if (!(k in editing)) return
    const raw = editing[k]
    const value = raw === '' ? null : raw
    updateMut.mutate({ id: asset.id, data: { [field]: value } })
    setEditing(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const commitMonth = (asset: AssetWithMonthly, mk: MonthKey) => {
    const k = ck(asset.id, `month_${mk}`)
    if (!(k in editing)) return
    const raw = editing[k]
    const amount = raw === '' ? null : Number(raw)
    monthMut.mutate({ assetId: asset.id, monthKey: mk, amount })
    setEditing(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const rowTotal = (asset: AssetWithMonthly) =>
    asset.monthly_values
      .filter(mv => mv.fy_start_year === fyStartYear)
      .reduce((s, mv) => s + (mv.amount != null ? Number(mv.amount) : 0), 0)

  const fmt = (v: number) => v ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-700">
          {fy.label} {l('asset.details.title', 'Asset Details')}
        </h3>
        <button
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => createMut.mutate()}
        >
          + {l('asset.details.add', 'Add Asset')}
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-medium sticky left-0 bg-gray-100 min-w-[130px]">
                {l('asset.details.col.category', 'Category')}
              </th>
              <th className="px-2 py-2 text-left font-medium min-w-[130px]">
                {l('asset.details.col.subcat', 'Sub-Category')}
              </th>
              <th className="px-2 py-2 text-left font-medium min-w-[110px]">
                {l('asset.details.col.holder', 'Holder')}
              </th>
              <th className="px-2 py-2 text-left font-medium min-w-[110px]">
                {l('asset.details.col.account', 'Account #')}
              </th>
              <th className="px-2 py-2 text-left font-medium min-w-[130px]">
                {l('asset.details.col.notes', 'Notes')}
              </th>
              {MONTH_KEYS.map(m => (
                <th key={m} className="px-2 py-2 text-right font-medium min-w-[80px]">
                  {MONTH_LABELS[m]}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold min-w-[90px]">
                {l('asset.details.col.total', 'Total')}
              </th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={18} className="px-4 py-4 text-center text-gray-400">
                  {l('asset.details.empty', 'No assets yet. Click "+ Add Asset" to get started.')}
                </td>
              </tr>
            )}
            {assets.map((asset, i) => (
              <tr key={asset.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {/* Category */}
                <td className="px-1 py-1 sticky left-0 bg-inherit">
                  <select
                    className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                    value={getVal(asset, 'asset_category')}
                    onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_category')]: e.target.value }))}
                    onBlur={() => commitField(asset, 'asset_category')}
                  >
                    <option value="">—</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                {/* Sub-category */}
                <td className="px-1 py-1">
                  <select
                    className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                    value={getVal(asset, 'asset_sub_category')}
                    onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_sub_category')]: e.target.value }))}
                    onBlur={() => commitField(asset, 'asset_sub_category')}
                  >
                    <option value="">—</option>
                    {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                {/* Holder */}
                <td className="px-1 py-1">
                  <select
                    className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                    value={getVal(asset, 'asset_holder')}
                    onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_holder')]: e.target.value }))}
                    onBlur={() => commitField(asset, 'asset_holder')}
                  >
                    <option value="">—</option>
                    {holders.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                {/* Account number */}
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                    value={getVal(asset, 'account_number')}
                    placeholder="—"
                    onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'account_number')]: e.target.value }))}
                    onFocus={() => setEditing(prev => ({ ...prev, [ck(asset.id, 'account_number')]: String(asset.account_number ?? '') }))}
                    onBlur={() => commitField(asset, 'account_number')}
                  />
                </td>
                {/* Notes */}
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className="w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                    value={getVal(asset, 'notes')}
                    placeholder="—"
                    onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'notes')]: e.target.value }))}
                    onFocus={() => setEditing(prev => ({ ...prev, [ck(asset.id, 'notes')]: String(asset.notes ?? '') }))}
                    onBlur={() => commitField(asset, 'notes')}
                  />
                </td>
                {/* Monthly values — filtered by fyStartYear */}
                {MONTH_KEYS.map(mk => (
                  <td key={mk} className="px-1 py-1">
                    <input
                      type="number"
                      className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                      value={getMonthVal(asset, mk)}
                      placeholder="—"
                      onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: e.target.value }))}
                      onFocus={() => {
                        const mv = asset.monthly_values.find(m => m.month_key === mk && m.fy_start_year === fyStartYear)
                        setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: String(mv?.amount ?? '') }))
                      }}
                      onBlur={() => commitMonth(asset, mk)}
                    />
                  </td>
                ))}
                {/* Row total for this FY */}
                <td className="px-2 py-1 text-right font-semibold">{fmt(rowTotal(asset))}</td>
                {/* Delete */}
                <td className="px-1 py-1 text-center">
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={() => { if (confirm('Delete this asset and all its monthly values?')) deleteMut.mutate(asset.id) }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {l('asset.details.hint', 'Click any cell to edit. Changes save automatically on blur.')}
      </p>
    </div>
  )
}
