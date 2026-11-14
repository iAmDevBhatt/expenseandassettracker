import { useMemo } from 'react'
import type { AssetWithMonthly } from '../../types'
import { MONTH_KEYS, MONTH_LABELS, type MonthKey } from '../../utils/financialYear'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  assets: AssetWithMonthly[]
  fyStartYear: number
}

export default function AssetSummaryTable({ assets, fyStartYear }: Props) {
  const { l } = useLabels()

  const rows = useMemo(() => {
    const map = new Map<string, Record<MonthKey, number> & { total: number }>()

    for (const asset of assets) {
      const key = asset.asset_sub_category ?? '(No Sub-Category)'
      if (!map.has(key)) {
        const entry: any = { total: 0 }
        MONTH_KEYS.forEach(m => (entry[m] = 0))
        map.set(key, entry)
      }
      const row = map.get(key)!
      for (const mv of asset.monthly_values) {
        if (mv.fy_start_year !== fyStartYear) continue
        const mk = mv.month_key as MonthKey
        if (MONTH_KEYS.includes(mk) && mv.amount != null) {
          row[mk] = (row[mk] ?? 0) + Number(mv.amount)
          row.total += Number(mv.amount)
        }
      }
    }

    return Array.from(map.entries()).map(([subCat, vals]) => ({ subCat, ...vals }))
  }, [assets, fyStartYear])

  const grandTotals = useMemo(() => {
    const totals: Record<MonthKey, number> & { total: number } = { total: 0 } as any
    MONTH_KEYS.forEach(m => (totals[m] = 0))
    for (const row of rows) {
      MONTH_KEYS.forEach(m => { totals[m] += row[m] })
      totals.total += row.total
    }
    return totals
  }, [rows])

  const fmt = (v: number) => v ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  if (rows.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-2">{l('asset.summary.title', 'Asset Summary')}</h3>

      {/* Phone cards — table below is sm: and up */}
      <div className="sm:hidden space-y-2">
        {rows.map(row => {
          const nonZeroMonths = MONTH_KEYS.filter(m => row[m] > 0)
          return (
            <div key={row.subCat} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{row.subCat}</span>
                <span className="text-sm font-semibold">{fmt(row.total)}</span>
              </div>
              {nonZeroMonths.length > 0 ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  {nonZeroMonths.map(m => (
                    <span key={m}>{MONTH_LABELS[m]}: <span className="text-gray-700">{fmt(row[m])}</span></span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">{l('asset.summary.nodata', 'No amounts recorded yet.')}</p>
              )}
            </div>
          )
        })}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-100 flex justify-between items-center font-semibold">
          <span className="text-sm text-gray-700">{l('asset.summary.footer.grand', 'Grand Total')}</span>
          <span className="text-sm">{fmt(grandTotals.total)}</span>
        </div>
      </div>

      <div className="hidden sm:block overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full min-w-max text-xs text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium sticky left-0 bg-gray-100 min-w-[160px]">
                {l('asset.summary.col.subcat', 'Sub-Category')}
              </th>
              {MONTH_KEYS.map(m => (
                <th key={m} className="px-2 py-2 text-right font-medium min-w-[80px]">{MONTH_LABELS[m]}</th>
              ))}
              <th className="px-3 py-2 text-right font-semibold min-w-[90px]">{l('asset.summary.col.total', 'Total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.subCat} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-1.5 font-medium sticky left-0 bg-inherit">{row.subCat}</td>
                {MONTH_KEYS.map(m => (
                  <td key={m} className="px-2 py-1.5 text-right">{fmt(row[m])}</td>
                ))}
                <td className="px-3 py-1.5 text-right font-semibold">{fmt(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-200 font-semibold">
            <tr>
              <td className="px-3 py-2 sticky left-0 bg-gray-200">{l('asset.summary.footer.grand', 'Grand Total')}</td>
              {MONTH_KEYS.map(m => (
                <td key={m} className="px-2 py-2 text-right">{fmt(grandTotals[m])}</td>
              ))}
              <td className="px-3 py-2 text-right">{fmt(grandTotals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
