import { useState } from 'react'
import type { BudgetSummary, BudgetEntry } from '../../types'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  summary: BudgetSummary | null
  entries: BudgetEntry[]
  totalActual: number
  onSave: (data: Partial<BudgetSummary>) => void
}

type EditableField = 'expected_income' | 'projected_loss_tax' | 'projected_target_saving' | 'targeted_saving' | 'actual_loss_tax'

export default function BudgetSummaryTable({ summary, entries, totalActual, onSave }: Props) {
  const { l } = useLabels()
  const [editing, setEditing] = useState<Partial<Record<EditableField, string>>>({})

  const projectedExpenditure = entries.reduce((sum, e) => sum + Number(e.amount_per_month) * e.qty, 0)

  const getValue = (field: EditableField): string => {
    if (field in editing) return editing[field] ?? ''
    const v = summary?.[field]
    return v != null ? String(v) : ''
  }

  const handleBlur = (field: EditableField) => {
    const raw = editing[field]
    if (raw === undefined) return
    const value = raw === '' ? null : Number(raw)
    const updates: Partial<BudgetSummary> = { [field]: value }
    setEditing(prev => { const n = { ...prev }; delete n[field]; return n })
    onSave(updates)
  }

  const expectedIncome = editing.expected_income !== undefined
    ? parseFloat(editing.expected_income) || 0
    : (summary?.expected_income ?? 0)
  const actualLossTax = editing.actual_loss_tax !== undefined
    ? parseFloat(editing.actual_loss_tax) || 0
    : (summary?.actual_loss_tax ?? 0)
  const actualSaving = Number(expectedIncome) - totalActual - Number(actualLossTax)

  const fmt = (v: number | null | undefined) =>
    v != null && !isNaN(v)
      ? v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })
      : '—'

  const inputCell = (field: EditableField) => (
    <td className="px-4 py-1 text-right">
      <input
        type="number"
        className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
        placeholder="—"
        value={getValue(field)}
        onChange={e => setEditing(prev => ({ ...prev, [field]: e.target.value }))}
        onFocus={() => setEditing(prev => ({ ...prev, [field]: String(summary?.[field] ?? '') }))}
        onBlur={() => handleBlur(field)}
      />
    </td>
  )

  const computedCell = (value: number) => (
    <td className="px-4 py-2 text-right text-gray-500 bg-gray-50">{fmt(value)}</td>
  )

  const rows: { label: string; cell: React.ReactNode }[] = [
    { label: l('budgetsummary.row.expectedincome'), cell: inputCell('expected_income') },
    { label: l('budgetsummary.row.projectedexpenditure'), cell: computedCell(projectedExpenditure) },
    { label: l('budgetsummary.row.projectedlosstax'), cell: inputCell('projected_loss_tax') },
    { label: l('budgetsummary.row.projectedtargetsaving'), cell: inputCell('projected_target_saving') },
    { label: l('budgetsummary.row.actualexpenditure'), cell: computedCell(totalActual) },
    { label: l('budgetsummary.row.actuallosstax'), cell: inputCell('actual_loss_tax') },
    { label: l('budgetsummary.row.targetedsaving'), cell: inputCell('targeted_saving') },
    { label: l('budgetsummary.row.actualsaving'), cell: computedCell(actualSaving) },
  ]

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-2">{l('budgetsummary.heading')}</h3>
      <p className="text-xs text-gray-400 mb-2">{l('budgetsummary.hint')}</p>
      <div className="overflow-x-auto rounded border border-gray-200 max-w-lg">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{l('budgetsummary.col.label')}</th>
              <th className="px-4 py-2 text-right font-medium w-48">{l('budgetsummary.col.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-medium">{row.label}</td>
                {row.cell}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
