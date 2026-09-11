import { useState, useRef, useEffect } from 'react'
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
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
          <div ref={categoryRef} className="relative">
            <input
              type="text"
              className="input-field"
              placeholder={form.category || l('addexpense.field.category.placeholder')}
              value={categorySearch}
              onChange={e => { setCategorySearch(e.target.value); setCategoryOpen(true) }}
              onFocus={() => setCategoryOpen(true)}
              autoComplete="off"
            />
            {form.category && !categorySearch && (
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-800 pointer-events-none">
                {form.category}
              </span>
            )}
            {categoryOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto">
                {(configs?.EXPENSE_CATEGORY ?? [])
                  .filter(c => c.value.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map(c => (
                    <div
                      key={c.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${form.category === c.value ? 'bg-blue-100 font-medium' : ''}`}
                      onMouseDown={() => {
                        setForm(prev => ({ ...prev, category: c.value }))
                        setCategorySearch('')
                        setCategoryOpen(false)
                      }}
                    >
                      {c.value}
                    </div>
                  ))}
                {(configs?.EXPENSE_CATEGORY ?? []).filter(c => c.value.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                )}
              </div>
            )}
          </div>
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
