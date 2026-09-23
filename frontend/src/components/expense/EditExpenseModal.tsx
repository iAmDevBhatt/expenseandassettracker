import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { updateExpense } from '../../api/expenseApi'
import { useLabels } from '../../hooks/useLabels'
import { ExpenseForm } from './ExpenseForm'
import type { Expense, ExpenseCreate } from '../../types'

interface Props {
  expense: Expense
  monthYearId: number
  year: number
  month: number
  quickCategories: string[]
  onClose: () => void
  onDelete?: () => void
}

export function EditExpenseModal({ expense, monthYearId, year, month, quickCategories, onClose, onDelete }: Props) {
  const queryClient = useQueryClient()
  const { l } = useLabels()

  const mutation = useMutation({
    mutationFn: (payload: ExpenseCreate) => updateExpense(expense.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', monthYearId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', monthYearId] })
      onClose()
    },
  })

  return (
    <Modal title={l('editexpense.title')} onClose={onClose}>
      <ExpenseForm
        labelPrefix="editexpense"
        initial={{
          expense_date: expense.expense_date,
          amount: String(expense.amount),
          description: expense.description ?? '',
          paid_via_cc: expense.paid_via_cc ?? '',
          category: expense.category,
        }}
        year={year}
        month={month}
        quickCategories={quickCategories}
        pending={mutation.isPending}
        errorMessage={mutation.isError ? l('editexpense.error') : null}
        onSubmit={(payload) => mutation.mutate(payload)}
        onCancel={onClose}
        onDelete={onDelete}
      />
    </Modal>
  )
}
