import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCashFlowRow } from '../../api/cashFlowApi'
import { CurrencyCell } from '../common/CurrencyCell'
import { useLabels } from '../../hooks/useLabels'
import type { CashFlowEntry } from '../../types'

interface Props {
  monthYearId: number
  rows: CashFlowEntry[]
}

export function OperatingCashFlowTable({ monthYearId, rows }: Props) {
  const queryClient = useQueryClient()
  const { l } = useLabels()
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const mutation = useMutation({
    mutationFn: ({ rowKey, amount }: { rowKey: string; amount: number }) =>
      updateCashFlowRow(monthYearId, rowKey, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', monthYearId] })
    },
  })

  const handleBlur = (rowKey: string) => {
    const el = inputRefs.current[rowKey]
    if (!el) return
    const amount = parseFloat(el.value) || 0
    mutation.mutate({ rowKey, amount })
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{l('cashflow.heading')}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="table-cell font-medium">{l('cashflow.col.category')}</th>
            <th className="table-cell font-medium text-right">{l('cashflow.col.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.row_key} className={`border-b ${row.computed ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <td className="table-cell text-gray-700">
                {row.label}
                {row.computed && (
                  <span className="ml-2 text-xs text-blue-500 font-medium">{l('cashflow.badge.auto')}</span>
                )}
              </td>
              <td className="table-cell text-right">
                {row.computed ? (
                  <CurrencyCell amount={row.amount} className="font-medium text-blue-700" />
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={row.amount}
                    ref={(el) => { inputRefs.current[row.row_key] = el }}
                    onBlur={() => handleBlur(row.row_key)}
                    className="w-40 text-right border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none py-1 px-2 bg-transparent"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
