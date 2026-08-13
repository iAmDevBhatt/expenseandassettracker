import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { createExpense } from '../../api/expenseApi'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  monthYearId: number
  onClose: () => void
}

export function AddExpenseModal({ monthYearId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { configs } = useConfigStore()
  const { l } = useLabels()

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    paid_via_cc: '',
    category: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      createExpense(monthYearId, {
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

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const valid = form.expense_date && form.amount && parseFloat(form.amount) > 0 && form.category

  return (
    <Modal title={l('addexpense.title')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate() }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('addexpense.field.date')}</label>
            <input type="date" value={form.expense_date} onChange={set('expense_date')} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('addexpense.field.amount')}</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} className="input-field" placeholder={l('addexpense.field.amount.placeholder')} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('addexpense.field.description')}</label>
          <input type="text" value={form.description} onChange={set('description')} className="input-field" placeholder={l('addexpense.field.description.placeholder')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('addexpense.field.category')}</label>
          <select value={form.category} onChange={set('category')} className="input-field" required>
            <option value="">{l('addexpense.field.category.placeholder')}</option>
            {configs?.EXPENSE_CATEGORY?.map((c) => (
              <option key={c.id} value={c.value}>{c.value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{l('addexpense.field.paidviacc')}</label>
          <select value={form.paid_via_cc} onChange={set('paid_via_cc')} className="input-field">
            <option value="">{l('addexpense.field.paidviacc.placeholder')}</option>
            {configs?.CREDIT_CARD?.map((c) => (
              <option key={c.id} value={c.value}>{c.value}</option>
            ))}
          </select>
        </div>

        {form.paid_via_cc && form.amount && (
          <p className="text-sm text-blue-600 bg-blue-50 rounded px-3 py-2">
            {l('addexpense.info.amountcc')} ₹{parseFloat(form.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {l('addexpense.error')}: {(mutation.error as any)?.response?.data?.detail ?? (mutation.error as any)?.message ?? 'Unknown error'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">{l('addexpense.button.cancel')}</button>
          <button type="submit" disabled={!valid || mutation.isPending} className="btn-primary">
            {mutation.isPending ? l('addexpense.button.submitting') : l('addexpense.button.submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
