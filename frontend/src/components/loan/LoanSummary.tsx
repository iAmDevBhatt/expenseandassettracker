import { useMemo } from 'react'
import type { LoanColumn, LoanEntry, LoanFYData } from '../../types'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  data: LoanFYData
  columns: LoanColumn[]
  interestPct: number | null
}

const inr = (v: number) =>
  `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const sideSum = (entries: LoanEntry[], acct: string) =>
  entries.reduce((s, e) => s + (e.amounts[acct] ?? 0), 0)

export default function LoanSummary({ data, columns, interestPct }: Props) {
  const { l } = useLabels()

  const rows = useMemo(() => {
    return columns.map(col => {
      const priorW = data.prior[col.name]?.withdrawn ?? 0
      const priorC = data.prior[col.name]?.credited ?? 0
      const fyW = sideSum(data.withdrawn, col.name)
      const fyC = sideSum(data.credited, col.name)
      const totalWithdrawn = priorW + fyW
      const current = priorW + fyW - priorC - fyC
      const interest = interestPct != null ? (interestPct / 100) * current : null
      return { name: col.name, totalWithdrawn, current, interest }
    })
  }, [data, columns, interestPct])

  const totalLoanAmount = rows.reduce((s, r) => s + r.totalWithdrawn, 0)
  const totalRemaining = rows.reduce((s, r) => s + r.current, 0)
  const totalInterest = interestPct != null ? (interestPct / 100) * totalRemaining : null

  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-gray-700 mb-3">{l('loan.summary.title', 'Summary')}</h3>

      {/* Summary totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            {l('loan.summary.totalloan', 'Total Loan Amount')}
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">{inr(totalLoanAmount)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            {l('loan.summary.totalremaining', 'Total Remaining Loan Amount')}
          </div>
          <div className={`text-xl font-bold mt-1 ${totalRemaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {inr(totalRemaining)}
          </div>
        </div>
      </div>

      {/* Sub-section A: Summary by loan accounts */}
      <h4 className="text-sm font-semibold text-gray-600 mb-2">
        {l('loan.summary.byaccount.title', 'Summary by Loan Account')}
      </h4>
      {interestPct == null && (
        <p className="text-xs text-amber-600 mb-2">
          {l('loan.summary.nopct', 'Set "Personal Loan Interest %" on the Configuration page to see monthly interest.')}
        </p>
      )}
      <div className="overflow-x-auto rounded border border-gray-200 max-w-3xl">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{l('loan.summary.col.account', 'Loan Account')}</th>
              <th className="px-4 py-2 text-right font-medium">{l('loan.summary.col.current', 'Current Loan Amount')}</th>
              <th className="px-4 py-2 text-right font-medium">
                {l('loan.summary.col.interest', 'Interest (Current Month)')}
                {interestPct != null && <span className="text-gray-400 font-normal"> · {interestPct}%</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                  {l('loan.summary.byaccount.empty', 'No loan accounts yet. Add a column in the ledger below.')}
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2 text-right">{inr(r.current)}</td>
                <td className="px-4 py-2 text-right">{r.interest != null ? inr(r.interest) : '—'}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-200 font-semibold">
              <tr>
                <td className="px-4 py-2">{l('loan.summary.footer.total', 'Total')}</td>
                <td className="px-4 py-2 text-right">{inr(totalRemaining)}</td>
                <td className="px-4 py-2 text-right">{totalInterest != null ? inr(totalInterest) : '—'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
