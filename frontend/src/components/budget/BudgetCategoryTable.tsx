import { useState, useEffect } from 'react'
import type { BudgetEntry, BudgetEntryUpsert, CategoryActual } from '../../types'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  categories: string[]
  entries: BudgetEntry[]
  actuals: CategoryActual[]
  onSave: (entries: BudgetEntryUpsert[]) => void
  saving: boolean
}

interface RowState {
  amount_per_month: string
  qty: string
}

export default function BudgetCategoryTable({ categories, entries, actuals, onSave, saving }: Props) {
  const { l } = useLabels()

  const entryMap: Record<string, BudgetEntry> = {}
  for (const e of entries) entryMap[e.category] = e

  const actualsMap: Record<string, number> = {}
  for (const a of actuals) actualsMap[a.category] = a.actual

  // Visible rows = categories that have a saved entry OR were manually added this session
  const [visibleCategories, setVisibleCategories] = useState<string[]>(() =>
    categories.filter(c => !!entryMap[c])
  )
  const [editing, setEditing] = useState<Record<string, RowState>>({})
  const [addSearch, setAddSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  // When entries reload (e.g. after save), sync visible list to include all persisted entries
  useEffect(() => {
    setVisibleCategories(prev => {
      const persisted = categories.filter(c => !!entryMap[c])
      const merged = [...new Set([...persisted, ...prev])]
      return merged.filter(c => categories.includes(c))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const hiddenCategories = categories.filter(c => !visibleCategories.includes(c))

  const handleAdd = (cat: string) => {
    setVisibleCategories(prev => [...prev, cat])
    setAddSearch('')
    setAddOpen(false)
  }

  const handleDelete = (cat: string) => {
    // Save a zero entry to the backend, then remove from visible list
    const allEntries: BudgetEntryUpsert[] = visibleCategories
      .filter(c => c !== cat)
      .map(c => {
        const e = entryMap[c]
        const ed = editing[c]
        return {
          category: c,
          amount_per_month: ed ? parseFloat(ed.amount_per_month) || 0 : (e ? Number(e.amount_per_month) : 0),
          qty: ed ? Math.min(12, Math.max(0, parseInt(ed.qty) || 0)) : (e ? e.qty : 0),
        }
      })
    // Also send a zeroed entry for the deleted category so the backend clears it
    allEntries.push({ category: cat, amount_per_month: 0, qty: 0 })
    onSave(allEntries)
    setVisibleCategories(prev => prev.filter(c => c !== cat))
    setEditing(prev => { const n = { ...prev }; delete n[cat]; return n })
  }

  const getRow = (cat: string): RowState => {
    if (editing[cat]) return editing[cat]
    const e = entryMap[cat]
    return { amount_per_month: e ? String(e.amount_per_month) : '0', qty: e ? String(e.qty) : '0' }
  }

  const handleChange = (cat: string, field: keyof RowState, value: string) => {
    setEditing(prev => ({
      ...prev,
      [cat]: { ...getRow(cat), [field]: value },
    }))
  }

  const handleBlur = (cat: string) => {
    const row = getRow(cat)
    const allEntries: BudgetEntryUpsert[] = visibleCategories.map(c => {
      if (c === cat) {
        return {
          category: c,
          amount_per_month: parseFloat(row.amount_per_month) || 0,
          qty: Math.min(12, Math.max(0, parseInt(row.qty) || 0)),
        }
      }
      const e = entryMap[c]
      const ed = editing[c]
      return {
        category: c,
        amount_per_month: ed ? parseFloat(ed.amount_per_month) || 0 : (e ? Number(e.amount_per_month) : 0),
        qty: ed ? Math.min(12, Math.max(0, parseInt(ed.qty) || 0)) : (e ? e.qty : 0),
      }
    })
    onSave(allEntries)
  }

  if (categories.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-2">{l('budgettable.heading')}</h3>
        <p className="text-sm text-gray-500">{l('budgettable.empty')}</p>
      </div>
    )
  }

  const grandProjected = visibleCategories.reduce((sum, cat) => {
    const row = getRow(cat)
    return sum + (parseFloat(row.amount_per_month) || 0) * (parseInt(row.qty) || 0)
  }, 0)

  const grandActual = visibleCategories.reduce((sum, cat) => sum + (actualsMap[cat] || 0), 0)

  const filteredHidden = hiddenCategories.filter(c =>
    c.toLowerCase().includes(addSearch.toLowerCase())
  )

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-700">{l('budgettable.heading')}</h3>
        {saving && <span className="text-xs text-blue-500">Saving…</span>}
      </div>
      <p className="text-xs text-gray-400 mb-2">{l('budgettable.hint')}</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{l('budgettable.col.category')}</th>
              <th className="px-4 py-2 text-right font-medium w-40">{l('budgettable.col.amountpermonth')}</th>
              <th className="px-4 py-2 text-right font-medium w-24">{l('budgettable.col.qty')}</th>
              <th className="px-4 py-2 text-right font-medium w-36">{l('budgettable.col.projected')}</th>
              <th className="px-4 py-2 text-right font-medium w-36">{l('budgettable.col.actual')}</th>
              <th className="px-4 py-2 text-left font-medium w-48">{l('budgettable.col.percentage')}</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {visibleCategories.map((cat, i) => {
              const row = getRow(cat)
              const projected = (parseFloat(row.amount_per_month) || 0) * (parseInt(row.qty) || 0)
              const actual = actualsMap[cat] || 0
              const pct = projected > 0 ? Math.min(100, (actual / projected) * 100) : 0
              const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-green-500'

              return (
                <tr key={cat} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-medium">{cat}</td>
                  <td className="px-4 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={row.amount_per_month}
                      onChange={e => handleChange(cat, 'amount_per_month', e.target.value)}
                      onBlur={() => handleBlur(cat)}
                    />
                  </td>
                  <td className="px-4 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      max="12"
                      step="1"
                      className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                      value={row.qty}
                      onChange={e => handleChange(cat, 'qty', e.target.value)}
                      onBlur={() => handleBlur(cat)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {projected > 0 ? projected.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {actual > 0 ? actual.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {projected > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[60px]">
                          <div
                            className={`h-3 rounded-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-10 text-right">{Math.round(pct)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => handleDelete(cat)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                      title={`Remove ${cat}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
            <tr>
              <td className="px-4 py-2">Total</td>
              <td />
              <td />
              <td className="px-4 py-2 text-right text-gray-600">
                {grandProjected > 0 ? grandProjected.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
              </td>
              <td className="px-4 py-2 text-right">
                {grandActual > 0 ? grandActual.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
              </td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add category row */}
      {hiddenCategories.length > 0 && (
        <div className="mt-3 relative inline-block">
          {!addOpen ? (
            <button
              onClick={() => setAddOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span className="text-lg leading-none">+</span> Add category
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-52"
                  placeholder="Search category…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  onBlur={() => { if (!addSearch) setAddOpen(false) }}
                />
                {(addSearch || addOpen) && filteredHidden.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredHidden.map(c => (
                      <div
                        key={c}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                        onMouseDown={() => handleAdd(c)}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
                {filteredHidden.length === 0 && addSearch && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg px-3 py-2 text-sm text-gray-400">
                    No categories found
                  </div>
                )}
              </div>
              <button onClick={() => { setAddOpen(false); setAddSearch('') }} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
