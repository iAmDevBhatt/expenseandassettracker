import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { updateExpense } from '../../api/expenseApi'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { Expense } from '../../types'

interface Props {
  expense: Expense
  monthYearId: number
  onClose: () => void
}

export function EditExpenseModal({ expense, monthYearId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { configs } = useConfigStore()
  const { l } = useLabels()

  const [form, setForm] = useState({
    expense_date: expense.expense_date,
    amount: String(expense.amount),
    description: expense.description ?? '',
    paid_via_cc: expense.paid_via_cc ?? '',
    category: expense.category,
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateExpense(expense.id, {
        expense_date: form.expense_date,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        paid_via_cc: form.paid_via_cc || null,
        category: form.category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', monthYearId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', monthYearId] })
      onClose()
    },
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <Modal title={l('editexpense.title')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('editexpense.field.date')}</label>
            <input type="date" value={form.expense_date} onChange={set('expense_date')} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('editexpense.field.amount')}</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} className="input-field" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('editexpense.field.description')}</label>
          <input type="text" value={form.description} onChange={set('description')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('editexpense.field.category')}</label>
          <select value={form.category} onChange={set('category')} className="input-field" required>
            <option value="">{l('editexpense.field.category.placeholder')}</option>
            {configs?.EXPENSE_CATEGORY?.map((c) => (
              <option key={c.id} value={c.value}>{c.value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('editexpense.field.paidviacc')}</label>
          <select value={form.paid_via_cc} onChange={set('paid_via_cc')} className="input-field">
            <option value="">{l('editexpense.field.paidviacc.placeholder')}</option>
            {configs?.CREDIT_CARD?.map((c) => (
              <option key={c.id} value={c.value}>{c.value}</option>
            ))}
          </select>
        </div>
        {mutation.isError && <p className="text-sm text-red-600">{l('editexpense.error')}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">{l('editexpense.button.cancel')}</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? l('editexpense.button.submitting') : l('editexpense.button.submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
