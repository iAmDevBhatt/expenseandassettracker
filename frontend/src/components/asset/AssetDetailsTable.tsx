import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssetWithMonthly, AssetBlueprint } from '../../types'
import { MONTH_KEYS, MONTH_LABELS, type MonthKey, type FYInfo } from '../../utils/financialYear'
import {
  createAsset,
  updateAsset,
  deleteAsset,
  upsertMonthlyValue,
} from '../../api/assetApi'
import { listAssetBlueprints } from '../../api/assetBlueprintApi'
import { useLabels } from '../../hooks/useLabels'
import { useConfigStore } from '../../store/configStore'
import RecordAssetValuesModal from './RecordAssetValuesModal'
import AddAssetPickerModal from './AddAssetPickerModal'

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
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const blueprintsQ = useQuery({ queryKey: ['asset-blueprints'], queryFn: listAssetBlueprints })

  const categories = configs?.ASSET_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const subCategories = configs?.ASSET_SUB_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const holders = configs?.ASSET_HOLDER?.filter(c => c.is_active).map(c => c.value) ?? []

  const createMut = useMutation({
    mutationFn: (blueprint: AssetBlueprint | null) =>
      createAsset(
        blueprint
          ? {
              name: blueprint.name,
              asset_category: blueprint.asset_category,
              asset_sub_category: blueprint.asset_sub_category,
              asset_holder: blueprint.asset_holder,
              account_number: blueprint.account_number,
            }
          : {},
      ),
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-700">
          {fy.label} {l('asset.details.title', 'Asset Details')}
        </h3>
        <div className="flex gap-2">
          <button
            className="flex-1 sm:flex-none text-sm px-3 py-1.5 sm:py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            onClick={() => setShowRecordModal(true)}
          >
            {l('asset.record.open', 'Record Values')}
          </button>
          <button
            className="flex-1 sm:flex-none text-sm px-3 py-1.5 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShowAddPicker(true)}
          >
            + {l('asset.details.add', 'Add Asset')}
          </button>
        </div>
      </div>

      {showRecordModal && (
        <RecordAssetValuesModal
          assets={assets}
          fy={fy}
          fyStartYear={fyStartYear}
          onClose={() => setShowRecordModal(false)}
        />
      )}

      {showAddPicker && (
        <AddAssetPickerModal
          blueprints={blueprintsQ.data ?? []}
          onPick={blueprint => { createMut.mutate(blueprint); setShowAddPicker(false) }}
          onClose={() => setShowAddPicker(false)}
        />
      )}

      <div className="hidden sm:block overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full min-w-max text-xs text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-medium sticky left-0 z-20 bg-gray-100 min-w-[130px]">
                {l('asset.details.col.category', 'Category')}
              </th>
              <th className="px-2 py-2 text-left font-medium sticky left-[130px] z-20 bg-gray-100 min-w-[130px]">
                {l('asset.details.col.subcat', 'Sub-Category')}
              </th>
              <th className="px-2 py-2 text-left font-medium sticky left-[260px] z-20 bg-gray-100 min-w-[110px]">
                {l('asset.details.col.holder', 'Holder')}
              </th>
              <th className="px-2 py-2 text-left font-medium sticky left-[370px] z-20 bg-gray-100 min-w-[110px] shadow-[4px_0_6px_-4px_rgba(0,0,0,0.25)]">
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
              <th className="px-2 py-2 sticky right-0 z-20 bg-gray-100 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.2)]"></th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={19} className="px-4 py-4 text-center text-gray-400">
                  {l('asset.details.empty', 'No assets yet. Click "+ Add Asset" to get started.')}
                </td>
              </tr>
            )}
            {assets.map((asset, i) => (
              <tr key={asset.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {/* Category */}
                <td className="px-1 py-1 sticky left-0 z-10 bg-inherit">
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
                <td className="px-1 py-1 sticky left-[130px] z-10 bg-inherit">
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
                <td className="px-1 py-1 sticky left-[260px] z-10 bg-inherit">
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
                <td className="px-1 py-1 sticky left-[370px] z-10 bg-inherit shadow-[4px_0_6px_-4px_rgba(0,0,0,0.25)]">
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
                    <div className="relative">
                      <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        {getMonthVal(asset, mk) !== '' ? '₹' : ''}
                      </span>
                    <input
                      type="number"
                      className="w-full text-right border border-transparent rounded pl-3 pr-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs"
                      value={getMonthVal(asset, mk)}
                      placeholder="—"
                      onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: e.target.value }))}
                      onFocus={() => {
                        const mv = asset.monthly_values.find(m => m.month_key === mk && m.fy_start_year === fyStartYear)
                        setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: String(mv?.amount ?? '') }))
                      }}
                      onBlur={() => commitMonth(asset, mk)}
                    />
                    </div>
                  </td>
                ))}
                {/* Row total for this FY */}
                <td className="px-2 py-1 text-right font-semibold">{fmt(rowTotal(asset))}</td>
                {/* Delete */}
                <td className="px-2 py-1 text-center sticky right-0 z-10 bg-inherit shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                  <button
                    onClick={() => { if (confirm('Delete this asset and all its monthly values?')) deleteMut.mutate(asset.id) }}
                    className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                    title="Delete asset"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards — table above is sm: and up */}
      <div className="sm:hidden space-y-3">
        {assets.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 rounded">
            {l('asset.details.empty', 'No assets yet. Click "+ Add Asset" to get started.')}
          </p>
        )}
        {assets.map(asset => (
          <div key={asset.id} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                <select
                  className="input-field text-sm"
                  value={getVal(asset, 'asset_category')}
                  onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_category')]: e.target.value }))}
                  onBlur={() => commitField(asset, 'asset_category')}
                >
                  <option value="">— {l('asset.details.col.category', 'Category')}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="input-field text-sm"
                  value={getVal(asset, 'asset_sub_category')}
                  onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_sub_category')]: e.target.value }))}
                  onBlur={() => commitField(asset, 'asset_sub_category')}
                >
                  <option value="">— {l('asset.details.col.subcat', 'Sub-Category')}</option>
                  {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="input-field text-sm"
                  value={getVal(asset, 'asset_holder')}
                  onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'asset_holder')]: e.target.value }))}
                  onBlur={() => commitField(asset, 'asset_holder')}
                >
                  <option value="">— {l('asset.details.col.holder', 'Holder')}</option>
                  {holders.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  className="input-field text-sm"
                  value={getVal(asset, 'account_number')}
                  placeholder={l('asset.details.col.account', 'Account #')}
                  onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'account_number')]: e.target.value }))}
                  onFocus={() => setEditing(prev => ({ ...prev, [ck(asset.id, 'account_number')]: String(asset.account_number ?? '') }))}
                  onBlur={() => commitField(asset, 'account_number')}
                />
              </div>
              <button
                onClick={() => { if (confirm('Delete this asset and all its monthly values?')) deleteMut.mutate(asset.id) }}
                className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none px-1"
                title="Delete asset"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              className="input-field text-sm mb-2"
              value={getVal(asset, 'notes')}
              placeholder={l('asset.details.col.notes', 'Notes')}
              onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, 'notes')]: e.target.value }))}
              onFocus={() => setEditing(prev => ({ ...prev, [ck(asset.id, 'notes')]: String(asset.notes ?? '') }))}
              onBlur={() => commitField(asset, 'notes')}
            />

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {MONTH_KEYS.map(mk => (
                <div key={mk} className="flex-shrink-0 w-16">
                  <div className="text-[10px] text-gray-400 text-center mb-0.5">{MONTH_LABELS[mk]}</div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      {getMonthVal(asset, mk) !== '' ? '₹' : ''}
                    </span>
                    <input
                      type="number"
                      className="w-full text-right border border-gray-300 rounded px-1 pl-4 py-1 text-sm"
                      value={getMonthVal(asset, mk)}
                      placeholder="—"
                      onChange={e => setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: e.target.value }))}
                      onFocus={() => {
                        const mv = asset.monthly_values.find(m => m.month_key === mk && m.fy_start_year === fyStartYear)
                        setEditing(prev => ({ ...prev, [ck(asset.id, `month_${mk}`)]: String(mv?.amount ?? '') }))
                      }}
                      onBlur={() => commitMonth(asset, mk)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 text-sm">
              <span className="text-gray-400">{l('asset.details.col.total', 'Total')}</span>
              <span className="font-semibold">{fmt(rowTotal(asset))}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        {l('asset.details.hint', 'Click any cell to edit. Changes save automatically on blur.')}
      </p>
    </div>
  )
}
