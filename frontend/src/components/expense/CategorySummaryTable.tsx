import { CurrencyCell } from '../common/CurrencyCell'
import { useLabels } from '../../hooks/useLabels'
import type { CategoryRow } from '../../types'

interface Props {
  rows: CategoryRow[]
}

export function CategorySummaryTable({ rows }: Props) {
  const { l } = useLabels()

  if (rows.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{l('categorysummary.heading')}</h2>
        <p className="text-sm text-gray-500">{l('categorysummary.empty')}</p>
      </div>
    )
  }

  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{l('categorysummary.heading')}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="table-cell font-medium">{l('categorysummary.col.category')}</th>
            <th className="table-cell font-medium text-right">{l('categorysummary.col.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b hover:bg-gray-50">
              <td className="table-cell">{row.category}</td>
              <td className="table-cell text-right">
                <CurrencyCell amount={row.amount} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold bg-gray-50">
            <td className="table-cell">{l('categorysummary.row.total')}</td>
            <td className="table-cell text-right">
              <CurrencyCell amount={total} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
