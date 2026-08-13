import { CurrencyCell } from '../common/CurrencyCell'
import { useLabels } from '../../hooks/useLabels'
import type { FinancialSummary } from '../../types'

interface Props {
  summary: FinancialSummary
}

export function FinancialSummaryTable({ summary }: Props) {
  const { l } = useLabels()

  const rows = [
    { label: l('financialsummary.row.income'),     amount: summary.income,               description: l('financialsummary.row.income.desc') },
    { label: l('financialsummary.row.spent'),      amount: summary.spent_minus_investment, description: l('financialsummary.row.spent.desc') },
    { label: l('financialsummary.row.investment'), amount: summary.investment,            description: l('financialsummary.row.investment.desc') },
    { label: l('financialsummary.row.ignore'),     amount: summary.ignore,               description: l('financialsummary.row.ignore.desc') },
    { label: l('financialsummary.row.open'),       amount: summary.open,                 description: l('financialsummary.row.open.desc'), isHighlight: true },
  ]

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{l('financialsummary.heading')}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="table-cell font-medium">{l('financialsummary.col.category')}</th>
            <th className="table-cell font-medium text-right">{l('financialsummary.col.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border-b ${row.isHighlight ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}`}>
              <td className="table-cell">
                <div>{row.label}</div>
                <div className="text-xs text-gray-400">{row.description}</div>
              </td>
              <td className="table-cell text-right">
                <CurrencyCell
                  amount={row.amount}
                  className={
                    row.isHighlight
                      ? row.amount >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold'
                      : ''
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
