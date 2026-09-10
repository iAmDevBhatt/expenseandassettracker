import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listExpenses, deleteExpense } from '../../api/expenseApi'
import { CurrencyCell } from '../common/CurrencyCell'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { AddExpenseModal } from './AddExpenseModal'
import { EditExpenseModal } from './EditExpenseModal'
import { useLabels } from '../../hooks/useLabels'
import type { Expense } from '../../types'

interface Props {
  monthYearId: number
}

export function ExpenseTable({ monthYearId }: Props) {
  const queryClient = useQueryClient()
  const { l } = useLabels()
  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

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
    if (window.confirm(l('expensetable.confirm.delete'))) deleteMutation.mutate(id)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{l('expensetable.heading')}</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary">{l('expensetable.button.add')}</button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{l('expensetable.empty')}</p>
      ) : (
        <>
          {/* Mobile card list (< sm) */}
          <div className="sm:hidden space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-medium text-gray-800">{expense.expense_date}</div>
                    <div className="text-gray-500 text-xs">{expense.description || '—'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-gray-800"><CurrencyCell amount={expense.amount} /></div>
                    {expense.paid_via_cc && (
                      <div className="text-xs text-gray-500 mt-0.5">{expense.paid_via_cc}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                    {expense.category}
                  </span>
                  <div className="flex gap-3">
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
                </div>
              </div>
            ))}
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

      {showAdd && <AddExpenseModal monthYearId={monthYearId} onClose={() => setShowAdd(false)} />}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          monthYearId={monthYearId}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  )
}
