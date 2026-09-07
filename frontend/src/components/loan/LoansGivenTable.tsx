import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LoanGiven, LoanGivenUpsert } from '../../types'
import { createLoanGiven, updateLoanGiven, deleteLoanGiven } from '../../api/loanApi'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  given: LoanGiven[]
}

const inr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

type TextField = 'person_name' | 'payment_method'
type DateField = 'given_date' | 'cleared_date'
type NumField = 'loan_amount' | 'paid_amount'

export default function LoansGivenTable({ given }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Record<string, string>>({})

  const invalidate = () => qc.invalidateQueries({ queryKey: ['loans-given'] })

  const addMut = useMutation({
    mutationFn: () => createLoanGiven({ given_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: invalidate,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoanGivenUpsert }) => updateLoanGiven(id, data),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({ mutationFn: deleteLoanGiven, onSuccess: invalidate })

  const ck = (id: number, field: string) => `${id}_${field}`

  const getVal = (row: LoanGiven, field: keyof LoanGiven) => {
    const k = ck(row.id, field)
    if (k in editing) return editing[k]
    const v = row[field]
    return v != null ? String(v) : ''
  }

  const setVal = (id: number, field: string, value: string) =>
    setEditing(prev => ({ ...prev, [ck(id, field)]: value }))

  const commit = (row: LoanGiven, field: TextField | DateField | NumField, kind: 'text' | 'date' | 'num') => {
    const k = ck(row.id, field)
    if (!(k in editing)) return
    const raw = editing[k]
    let value: string | number | null
    if (raw === '') value = null
    else if (kind === 'num') value = Number(raw)
    else value = raw
    setEditing(prev => { const n = { ...prev }; delete n[k]; return n })
    updateMut.mutate({ id: row.id, data: { [field]: value } })
  }

  const outstanding = (row: LoanGiven) => (row.loan_amount ?? 0) - (row.paid_amount ?? 0)
  const totalGiven = given.reduce((s, r) => s + (r.loan_amount ?? 0), 0)
  const totalPaid = given.reduce((s, r) => s + (r.paid_amount ?? 0), 0)
  const totalOutstanding = totalGiven - totalPaid

  const inputCls =
    'w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs'

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2 max-w-5xl">
        <div>
          <h3 className="text-base font-semibold text-gray-700">
            {l('loan.given.title', 'Loans Given to Others (Bad Debt Watch)')}
          </h3>
          <p className="text-xs text-gray-400">
            {l('loan.given.hint', 'Money you lent out. Click any cell to edit; changes save on blur.')}
          </p>
        </div>
        <button
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
          onClick={() => addMut.mutate()}
        >
          + {l('loan.given.add', 'Add Entry')}
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 max-w-5xl">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{l('loan.given.col.givendate', 'Given Date')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[140px]">{l('loan.given.col.person', 'Person Name')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[130px]">{l('loan.given.col.method', 'Payment Method')}</th>
              <th className="px-2 py-2 text-right font-medium min-w-[110px]">{l('loan.given.col.amount', 'Loan Amount')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{l('loan.given.col.cleareddate', 'Cleared Date')}</th>
              <th className="px-2 py-2 text-right font-medium min-w-[110px]">{l('loan.given.col.paid', 'Loan Paid Amount')}</th>
              <th className="px-2 py-2 text-right font-medium min-w-[110px]">{l('loan.given.col.outstanding', 'Outstanding')}</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {given.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-gray-400">
                  {l('loan.given.empty', 'Nothing recorded. Click "+ Add Entry" when you lend money out.')}
                </td>
              </tr>
            )}
            {given.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-1 py-1">
                  <input type="date" className={inputCls}
                    value={getVal(row, 'given_date')}
                    onChange={e => setVal(row.id, 'given_date', e.target.value)}
                    onBlur={() => commit(row, 'given_date', 'date')} />
                </td>
                <td className="px-1 py-1">
                  <input type="text" className={inputCls} placeholder="—"
                    value={getVal(row, 'person_name')}
                    onChange={e => setVal(row.id, 'person_name', e.target.value)}
                    onFocus={() => setVal(row.id, 'person_name', String(row.person_name ?? ''))}
                    onBlur={() => commit(row, 'person_name', 'text')} />
                </td>
                <td className="px-1 py-1">
                  <input type="text" className={inputCls} placeholder="Cash / UPI / …"
                    value={getVal(row, 'payment_method')}
                    onChange={e => setVal(row.id, 'payment_method', e.target.value)}
                    onFocus={() => setVal(row.id, 'payment_method', String(row.payment_method ?? ''))}
                    onBlur={() => commit(row, 'payment_method', 'text')} />
                </td>
                <td className="px-1 py-1">
                  <input type="number" className={`${inputCls} text-right`} placeholder="—"
                    value={getVal(row, 'loan_amount')}
                    onChange={e => setVal(row.id, 'loan_amount', e.target.value)}
                    onFocus={() => setVal(row.id, 'loan_amount', String(row.loan_amount ?? ''))}
                    onBlur={() => commit(row, 'loan_amount', 'num')} />
                </td>
                <td className="px-1 py-1">
                  <input type="date" className={inputCls}
                    value={getVal(row, 'cleared_date')}
                    onChange={e => setVal(row.id, 'cleared_date', e.target.value)}
                    onBlur={() => commit(row, 'cleared_date', 'date')} />
                </td>
                <td className="px-1 py-1">
                  <input type="number" className={`${inputCls} text-right`} placeholder="—"
                    value={getVal(row, 'paid_amount')}
                    onChange={e => setVal(row.id, 'paid_amount', e.target.value)}
                    onFocus={() => setVal(row.id, 'paid_amount', String(row.paid_amount ?? ''))}
                    onBlur={() => commit(row, 'paid_amount', 'num')} />
                </td>
                <td className={`px-2 py-1 text-right font-medium ${outstanding(row) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {inr(outstanding(row))}
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    className="text-red-400 hover:text-red-600"
                    title="Delete"
                    onClick={() => { if (confirm('Delete this entry?')) deleteMut.mutate(row.id) }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {given.length > 0 && (
            <tfoot className="bg-gray-200 font-semibold">
              <tr>
                <td className="px-2 py-2" colSpan={3}>{l('loan.given.footer.total', 'Total')}</td>
                <td className="px-2 py-2 text-right">{inr(totalGiven)}</td>
                <td></td>
                <td className="px-2 py-2 text-right">{inr(totalPaid)}</td>
                <td className="px-2 py-2 text-right">{inr(totalOutstanding)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
