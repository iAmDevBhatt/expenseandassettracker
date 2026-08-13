import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LiquidAsset } from '../../types'
import { updateLiquidAsset } from '../../api/assetApi'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  data: LiquidAsset
}

type LiquidField = keyof Omit<LiquidAsset, 'id'>

const FIELDS: { field: LiquidField; group: 'current' | 'target'; label: string }[] = [
  { field: 'current_fixed',   group: 'current', label: 'Fixed' },
  { field: 'current_savings', group: 'current', label: 'Savings' },
  { field: 'current_cash',    group: 'current', label: 'Cash' },
  { field: 'target_fixed',    group: 'target',  label: 'Fixed' },
  { field: 'target_savings',  group: 'target',  label: 'Savings' },
  { field: 'target_cash',     group: 'target',  label: 'Cash' },
]

export default function LiquidAssetsTable({ data }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Partial<Record<LiquidField, string>>>({})

  const mut = useMutation({
    mutationFn: (patch: Partial<Record<LiquidField, number | null>>) => updateLiquidAsset(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquid-asset'] }),
  })

  const handleBlur = (field: LiquidField) => {
    if (!(field in editing)) return
    const raw = editing[field]
    const value = raw === '' || raw === undefined ? null : Number(raw)
    mut.mutate({ [field]: value })
    setEditing(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-2">
        {l('asset.liquid.title', 'Liquid Assets')}
      </h3>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium" colSpan={1}></th>
              <th className="px-4 py-2 text-center font-medium border-l" colSpan={3}>
                {l('asset.liquid.group.current', 'Current')}
              </th>
              <th className="px-4 py-2 text-center font-medium border-l" colSpan={3}>
                {l('asset.liquid.group.target', 'Target')}
              </th>
            </tr>
            <tr className="bg-gray-50 text-xs">
              <td className="px-4 py-1"></td>
              {FIELDS.map(f => (
                <th key={f.field} className={`px-3 py-1 text-right font-medium ${f.group === 'target' && f.label === 'Fixed' ? 'border-l' : ''}`}>
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-4 py-2 font-medium">{l('asset.liquid.row.amount', 'Amount (₹)')}</td>
              {FIELDS.map(f => (
                <td key={f.field} className={`px-2 py-1 ${f.group === 'target' && f.label === 'Fixed' ? 'border-l' : ''}`}>
                  <input
                    type="number"
                    className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                    value={f.field in editing ? editing[f.field]! : (data[f.field] ?? '')}
                    placeholder="—"
                    onChange={e => setEditing(prev => ({ ...prev, [f.field]: e.target.value }))}
                    onFocus={() => setEditing(prev => ({ ...prev, [f.field]: String(data[f.field] ?? '') }))}
                    onBlur={() => handleBlur(f.field)}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1">{l('asset.liquid.hint', 'Click a cell to edit, press Tab or click away to save.')}</p>
    </div>
  )
}
