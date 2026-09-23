import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listExpenses, deleteExpense } from '../../api/expenseApi'
import { CurrencyCell } from '../common/CurrencyCell'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { AddExpenseModal } from './AddExpenseModal'
import { EditExpenseModal } from './EditExpenseModal'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { Expense } from '../../types'

interface Props {
  monthYearId: number
  year: number
  month: number
}

const QUICK_CATEGORY_COUNT = 6

export function ExpenseTable({ monthYearId, year, month }: Props) {
  const queryClient = useQueryClient()
  const { l } = useLabels()
  const { configs } = useConfigStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // `?add=1` (used by the installed app's "Add expense" shortcut) opens the add sheet directly
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowAdd(true)
      searchParams.delete('add')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', monthYearId],
    queryFn: () => listExpenses(monthYearId),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', monthYearId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', monthYearId] })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm(l('expensetable.confirm.delete'))) {
      deleteMutation.mutate(id)
      return true
    }
    return false
  }

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

  // Most-used categories this month first, topped up from the configured order
  const quickCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of expenses) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
    const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
    const configured = (configs?.EXPENSE_CATEGORY ?? []).map(c => c.value)
    const merged = [...used, ...configured.filter(c => !used.includes(c))]
    return merged.slice(0, QUICK_CATEGORY_COUNT)
  }, [expenses, configs])

  // Phone view: newest day first, grouped by date with a per-day total
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const e of [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.id - a.id)) {
      const list = groups.get(e.expense_date) ?? []
      list.push(e)
      groups.set(e.expense_date, list)
    }
    return [...groups.entries()]
  }, [expenses])

  const formatDay = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{l('expensetable.heading')}</h2>
          {expenses.length > 0 && (
            <p className="text-xs text-gray-500">
              {expenses.length} {l('expensetable.summary.count', 'entries')} · {l('expensetable.summary.total', 'Total')}{' '}
              <CurrencyCell amount={total} className="font-semibold text-gray-700" />
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary hidden sm:block">{l('expensetable.button.add')}</button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{l('expensetable.empty')}</p>
      ) : (
        <>
          {/* Phone list (< sm): grouped by day, tap a row to edit */}
          <div className="sm:hidden -mx-4 pb-16">
            {dayGroups.map(([day, items]) => (
              <div key={day}>
                <div className="flex justify-between px-4 py-1.5 bg-gray-50 border-y border-gray-100 text-xs font-medium text-gray-500">
                  <span>{formatDay(day)}</span>
                  <CurrencyCell amount={items.reduce((s, e) => s + Number(e.amount), 0)} />
                </div>
                {items.map(expense => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => setEditingExpense(expense)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 active:bg-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {expense.description || expense.category}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 min-w-0">
                        <span className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded truncate">
                          {expense.category}
                        </span>
                        {expense.paid_via_cc && <span className="truncate">💳 {expense.paid_via_cc}</span>}
                      </div>
                    </div>
                    <CurrencyCell amount={expense.amount} className="text-sm font-semibold text-gray-900 shrink-0" />
                  </button>
                ))}
              </div>
            ))}
            <p className="text-center text-xs text-gray-400 pt-3">{l('expensetable.hint.tapedit', 'Tap an expense to edit or delete it')}</p>
          </div>

          {/* Desktop / tablet table (≥ sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="table-cell font-medium">{l('expensetable.col.date')}</th>
                  <th className="table-cell font-medium">{l('expensetable.col.amount')}</th>
                  <th className="table-cell font-medium">{l('expensetable.col.description')}</th>
                  <th className="table-cell font-medium">{l('expensetable.col.amountcc')}</th>
                  <th className="table-cell font-medium">{l('expensetable.col.paidviacc')}</th>
                  <th className="table-cell font-medium">{l('expensetable.col.category')}</th>
                  <th className="table-cell font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="table-cell">{expense.expense_date}</td>
                    <td className="table-cell"><CurrencyCell amount={expense.amount} /></td>
                    <td className="table-cell text-gray-700 max-w-xs truncate">{expense.description || '—'}</td>
                    <td className="table-cell"><CurrencyCell amount={expense.amount_cc} /></td>
                    <td className="table-cell text-gray-600">{expense.paid_via_cc || '—'}</td>
                    <td className="table-cell">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                        {expense.category}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-gray-400 hover:text-primary-600 text-xs"
                        >
                          {l('expensetable.action.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-gray-400 hover:text-red-600 text-xs"
                        >
                          {l('expensetable.action.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Floating add button — phones only, sits above the iPhone home indicator */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label={l('expensetable.button.add')}
        className="sm:hidden fixed right-5 bottom-safe z-40 h-14 w-14 rounded-full bg-primary-700 text-white text-3xl leading-none shadow-lg active:bg-primary-800 flex items-center justify-center"
      >
        +
      </button>

      {showAdd && (
        <AddExpenseModal
          monthYearId={monthYearId}
          year={year}
          month={month}
          quickCategories={quickCategories}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          monthYearId={monthYearId}
          year={year}
          month={month}
          quickCategories={quickCategories}
          onClose={() => setEditingExpense(null)}
          onDelete={() => { if (handleDelete(editingExpense.id)) setEditingExpense(null) }}
        />
      )}
    </div>
  )
}
