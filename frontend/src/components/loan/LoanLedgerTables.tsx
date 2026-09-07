import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LoanColumn, LoanEntry, LoanFYData } from '../../types'
import {
  addLoanColumn,
  deleteLoanColumn,
  createLoanEntry,
  updateLoanEntry,
  deleteLoanEntry,
  upsertLoanAmount,
} from '../../api/loanApi'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  fyStartYear: number
  data: LoanFYData
  columns: LoanColumn[]
  loanAccountOptions: string[]
}

const inr = (v: number) =>
  v ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'

const sideSum = (entries: LoanEntry[], acct: string) =>
  entries.reduce((s, e) => s + (e.amounts[acct] ?? 0), 0)

export default function LoanLedgerTables({ fyStartYear, data, columns, loanAccountOptions }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [newColumn, setNewColumn] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loan-data', fyStartYear] })
    qc.invalidateQueries({ queryKey: ['loan-columns'] })
  }

  const addColMut = useMutation({ mutationFn: addLoanColumn, onSuccess: () => { setNewColumn(''); invalidate() } })
  const delColMut = useMutation({ mutationFn: deleteLoanColumn, onSuccess: invalidate })
  const addRowMut = useMutation({
    mutationFn: (side: 'WITHDRAWN' | 'CREDITED') =>
      createLoanEntry(fyStartYear, side, new Date().toISOString().slice(0, 10)),
    onSuccess: invalidate,
  })
  const updRowMut = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string | null }) => updateLoanEntry(id, date),
    onSuccess: invalidate,
  })
  const delRowMut = useMutation({ mutationFn: deleteLoanEntry, onSuccess: invalidate })
  const amountMut = useMutation({
    mutationFn: ({ id, acct, amount }: { id: number; acct: string; amount: number | null }) =>
      upsertLoanAmount(id, acct, amount),
    onSuccess: invalidate,
  })

  const ck = (id: number, field: string) => `${id}_${field}`
  const setVal = (id: number, field: string, value: string) =>
    setEditing(prev => ({ ...prev, [ck(id, field)]: value }))
  const clearVal = (id: number, field: string) =>
    setEditing(prev => { const n = { ...prev }; delete n[ck(id, field)]; return n })

  const commitDate = (entry: LoanEntry) => {
    const k = ck(entry.id, 'date')
    if (!(k in editing)) return
    const raw = editing[k]
    clearVal(entry.id, 'date')
    updRowMut.mutate({ id: entry.id, date: raw === '' ? null : raw })
  }

  const commitAmount = (entry: LoanEntry, acct: string) => {
    const k = ck(entry.id, acct)
    if (!(k in editing)) return
    const raw = editing[k]
    clearVal(entry.id, acct)
    amountMut.mutate({ id: entry.id, acct, amount: raw === '' ? null : Number(raw) })
  }

  const availableToAdd = loanAccountOptions.filter(o => !columns.some(c => c.name === o))

  const opening = (acct: string) =>
    (data.prior[acct]?.withdrawn ?? 0) - (data.prior[acct]?.credited ?? 0)

  const inputCls =
    'w-full border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-xs'

  const renderTable = (
    title: string,
    side: 'WITHDRAWN' | 'CREDITED',
    entries: LoanEntry[],
    showOpening: boolean,
  ) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
        <button
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
          onClick={() => addRowMut.mutate(side)}
        >
          + {l('loan.ledger.addrow', 'Add Row')}
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-medium sticky left-0 bg-gray-100 min-w-[120px]">
                {l('loan.ledger.col.date', 'Date')}
              </th>
              {columns.map(col => (
                <th key={col.id} className="px-2 py-2 text-right font-medium min-w-[110px]">
                  <div className="flex items-center justify-end gap-1">
                    <span>{col.name}</span>
                    <button
                      className="text-red-300 hover:text-red-600"
                      title={l('loan.ledger.delcol', 'Remove this column from both tables')}
                      onClick={() => {
                        if (confirm(`Remove column "${col.name}" from both tables? All its amounts will be deleted.`))
                          delColMut.mutate(col.id)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {columns.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-4 text-center text-gray-400">
                  {l('loan.ledger.nocols', 'Add a loan-account column to start.')}
                </td>
              </tr>
            )}

            {showOpening && columns.length > 0 && (
              <tr className="bg-blue-50 text-gray-600">
                <td className="px-2 py-1.5 font-medium sticky left-0 bg-blue-50">
                  {l('loan.ledger.opening', 'Opening (carried forward)')}
                </td>
                {columns.map(col => (
                  <td key={col.id} className="px-2 py-1.5 text-right">{inr(opening(col.name))}</td>
                ))}
                <td></td>
              </tr>
            )}

            {entries.map((entry, i) => (
              <tr key={entry.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-1 py-1 sticky left-0 bg-inherit">
                  <input
                    type="date"
                    className={inputCls}
                    value={ck(entry.id, 'date') in editing ? editing[ck(entry.id, 'date')] : (entry.entry_date ?? '')}
                    onChange={e => setVal(entry.id, 'date', e.target.value)}
                    onBlur={() => commitDate(entry)}
                  />
                </td>
                {columns.map(col => (
                  <td key={col.id} className="px-1 py-1">
                    <input
                      type="number"
                      className={`${inputCls} text-right`}
                      placeholder="—"
                      value={
                        ck(entry.id, col.name) in editing
                          ? editing[ck(entry.id, col.name)]
                          : (entry.amounts[col.name] ?? '')
                      }
                      onChange={e => setVal(entry.id, col.name, e.target.value)}
                      onFocus={() => setVal(entry.id, col.name, String(entry.amounts[col.name] ?? ''))}
                      onBlur={() => commitAmount(entry, col.name)}
                    />
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <button
                    className="text-red-400 hover:text-red-600"
                    title="Delete row"
                    onClick={() => { if (confirm('Delete this row?')) delRowMut.mutate(entry.id) }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}

            {entries.length === 0 && columns.length > 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-3 text-center text-gray-400">
                  {l('loan.ledger.norows', 'No entries yet. Click "+ Add Row".')}
                </td>
              </tr>
            )}
          </tbody>
          {columns.length > 0 && (
            <tfoot className="bg-gray-200 font-semibold">
              <tr>
                <td className="px-2 py-2 sticky left-0 bg-gray-200">{l('loan.ledger.fytotal', 'FY Total')}</td>
                {columns.map(col => (
                  <td key={col.id} className="px-2 py-2 text-right">{inr(sideSum(entries, col.name))}</td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-gray-700 mb-1">
        {l('loan.ledger.title', 'Loan Ledger')}
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        {l('loan.ledger.hint',
          'Withdrawn = money taken out of a savings account as a self-loan. Credited = money paid back into it. ' +
          'Columns are shared by both tables. Cells save on blur.')}
      </p>

      {/* Column manager */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-medium text-gray-600">{l('loan.ledger.addcol', 'Add loan-account column')}:</span>
        <select
          className="text-xs border border-gray-300 rounded px-2 py-1"
          value={newColumn}
          onChange={e => setNewColumn(e.target.value)}
        >
          <option value="">{l('loan.ledger.selectaccount', 'Select account…')}</option>
          {availableToAdd.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          className="text-xs px-2 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-40"
          disabled={!newColumn || addColMut.isPending}
          onClick={() => newColumn && addColMut.mutate(newColumn)}
        >
          {l('loan.ledger.addcol.btn', 'Add Column')}
        </button>
        {availableToAdd.length === 0 && loanAccountOptions.length > 0 && (
          <span className="text-xs text-gray-400">{l('loan.ledger.alladded', 'All configured accounts added.')}</span>
        )}
        {loanAccountOptions.length === 0 && (
          <span className="text-xs text-amber-600">
            {l('loan.ledger.noconfig', 'Add "Loan Accounts" values on the Configuration page first.')}
          </span>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {renderTable(l('loan.ledger.withdrawn', 'Withdrawn'), 'WITHDRAWN', data.withdrawn, true)}
        {renderTable(l('loan.ledger.credited', 'Credited'), 'CREDITED', data.credited, false)}
      </div>
    </div>
  )
}
