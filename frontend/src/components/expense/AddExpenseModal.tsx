import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { createExpense } from '../../api/expenseApi'
import { useLabels } from '../../hooks/useLabels'
import { ExpenseForm, defaultExpenseDate } from './ExpenseForm'
import type { ExpenseCreate } from '../../types'

interface Props {
  monthYearId: number
  year: number
  month: number
  quickCategories: string[]
  onClose: () => void
}

export function AddExpenseModal({ monthYearId, year, month, quickCategories, onClose }: Props) {
  const queryClient = useQueryClient()
  const { l } = useLabels()
  const [resetKey, setResetKey] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ payload }: { payload: ExpenseCreate; addAnother: boolean }) =>
      createExpense(monthYearId, payload),
    onSuccess: (_data, { payload, addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', monthYearId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', monthYearId] })
      if (addAnother) {
        setFlash(`${l('expenseform.added', 'Added')} ₹${payload.amount.toLocaleString('en-IN')} · ${payload.category}`)
        setResetKey(k => k + 1)
      } else {
        onClose()
      }
    },
  })

  const err = mutation.error as { response?: { data?: { detail?: string } }; message?: string } | null
  const errorMessage = mutation.isError
    ? `${l('addexpense.error')}: ${err?.response?.data?.detail ?? err?.message ?? 'Unknown error'}`
    : null

  return (
    <Modal title={l('addexpense.title')} onClose={onClose}>
      <ExpenseForm
        labelPrefix="addexpense"
        initial={{
          expense_date: defaultExpenseDate(year, month),
          amount: '',
          description: '',
          paid_via_cc: '',
          category: '',
        }}
        year={year}
        month={month}
        quickCategories={quickCategories}
        pending={mutation.isPending}
        errorMessage={errorMessage}
        onSubmit={(payload, addAnother) => { setFlash(null); mutation.mutate({ payload, addAnother }) }}
        onCancel={onClose}
        allowAddAnother
        resetKey={resetKey}
        flash={flash}
      />
    </Modal>
  )
}
