import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import type { AssetWithMonthly } from '../../types'
import { MONTH_KEYS, MONTH_LABELS, type MonthKey, type FYInfo } from '../../utils/financialYear'
import { upsertMonthlyValue } from '../../api/assetApi'
import { useLabels } from '../../hooks/useLabels'
import { useConfigStore } from '../../store/configStore'

interface Props {
  assets: AssetWithMonthly[]
  fy: FYInfo
  fyStartYear: number
  onClose: () => void
}

// Only defaults to today's real month when today actually falls inside the FY being viewed;
// otherwise the user is backfilling/reviewing a different FY and APR is a safer starting point.
function currentMonthKeyForFY(fyStartYear: number): MonthKey | null {
  const now = new Date()
  const m = now.getMonth() + 1
  const y = now.getFullYear()
  const todayFYStart = m >= 4 ? y : y - 1
  if (todayFYStart !== fyStartYear) return null
  const idx = m >= 4 ? m - 4 : m + 8
  return MONTH_KEYS[idx]
}

export default function RecordAssetValuesModal({ assets, fy, fyStartYear, onClose }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const { configs } = useConfigStore()

  const configHolders = configs?.ASSET_HOLDER?.filter(c => c.is_active).map(c => c.value) ?? []
  const assetHolderSet = new Set(assets.map(a => a.asset_holder).filter((h): h is string => !!h))
  const holderOptions = configHolders.filter(h => assetHolderSet.has(h))

  const [holder, setHolder] = useState(holderOptions[0] ?? '')
  const [month, setMonth] = useState<MonthKey>(currentMonthKeyForFY(fyStartYear) ?? 'APR')
  const [values, setValues] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

  const rows = useMemo(
    () => assets
      .filter(a => a.asset_holder === holder)
      .sort((a, b) =>
        (a.asset_sub_category ?? '').localeCompare(b.asset_sub_category ?? '') ||
        (a.account_number ?? a.name ?? '').localeCompare(b.account_number ?? b.name ?? '')
      ),
    [assets, holder]
  )

  const valueFor = (asset: AssetWithMonthly) => {
    if (asset.id in values) return values[asset.id]
    const existing = asset.monthly_values.find(mv => mv.month_key === month && mv.fy_start_year === fyStartYear)?.amount
    return existing != null ? String(existing) : ''
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(values)
      await Promise.all(entries.map(([assetId, raw]) =>
        upsertMonthlyValue(Number(assetId), month, raw === '' ? null : Number(raw), fyStartYear)
      ))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      setValues({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <Modal title={l('asset.record.title', 'Record Monthly Values')} onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {l('asset.record.hint', 'Pick a bank/broker and enter every account you see in one go.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {l('asset.record.holder', 'Holder')}
            </label>
            <select
              className="input-field w-full"
              value={holder}
              onChange={e => { setHolder(e.target.value); setValues({}) }}
            >
              {holderOptions.length === 0 && <option value="">—</option>}
              {holderOptions.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {l('asset.record.month', 'Month')} ({fy.label})
            </label>
            <select
              className="input-field w-full"
              value={month}
              onChange={e => { setMonth(e.target.value as MonthKey); setValues({}) }}
            >
              {MONTH_KEYS.map(mk => <option key={mk} value={mk}>{MONTH_LABELS[mk]}</option>)}
            </select>
          </div>
        </div>

        {holderOptions.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">
            {l('asset.record.noholders', 'No holder has any assets yet. Add assets with a Holder set in Asset Details first.')}
          </p>
        )}

        {holderOptions.length > 0 && rows.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">
            {l('asset.record.norows', 'No assets found for this holder.')}
          </p>
        )}

        {rows.length > 0 && (
          <div className="border border-gray-200 rounded divide-y">
            {rows.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {asset.account_number || asset.name || `#${asset.id}`}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {asset.asset_category ?? '—'} · {asset.asset_sub_category ?? '—'}
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input-field w-32 text-right"
                  placeholder="—"
                  value={valueFor(asset)}
                  onChange={e => setValues(prev => ({ ...prev, [asset.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        {saved && (
          <p className="text-sm text-green-600">{l('asset.record.saved', 'Saved.')}</p>
        )}

        {saveMut.isError && (
          <p className="text-sm text-red-500">{l('asset.record.error', 'Failed to save. Please try again.')}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 sheet-footer">
          <button
            type="button"
            className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            {l('asset.record.close', 'Close')}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={rows.length === 0 || Object.keys(values).length === 0 || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? l('asset.record.saving', 'Saving…') : l('asset.record.save', 'Save All')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
