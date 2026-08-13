import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProtectionTarget } from '../../types'
import { updateProtectionTarget } from '../../api/assetApi'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  targets: ProtectionTarget[]
}

type Field = 'current_value' | 'target_value'

export default function ProtectionTargetsTable({ targets }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Record<string, string>>({})

  const mut = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: Field; value: number | null }) =>
      updateProtectionTarget(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['protection-targets'] }),
  })

  const key = (id: number, field: Field) => `${id}_${field}`

  const handleBlur = (target: ProtectionTarget, field: Field) => {
    const k = key(target.id, field)
    const raw = editing[k]
    if (raw === undefined) return
    const value = raw === '' ? null : Number(raw)
    mut.mutate({ id: target.id, field, value })
    setEditing(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-2">
        {l('asset.protection.title', 'Protection & Savings Targets')}
      </h3>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{l('asset.protection.col.category', 'Category')}</th>
              <th className="px-4 py-2 text-right font-medium">{l('asset.protection.col.current', 'Current')}</th>
              <th className="px-4 py-2 text-right font-medium">{l('asset.protection.col.target', 'Target')}</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-medium">{t.category}</td>
                {(['current_value', 'target_value'] as Field[]).map(field => {
                  const k = key(t.id, field)
                  const isEditing = k in editing
                  return (
                    <td key={field} className="px-4 py-1 text-right">
                      <input
                        type="number"
                        className="w-full text-right border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
                        value={isEditing ? editing[k] : (t[field] ?? '')}
                        placeholder="—"
                        onChange={e => setEditing(prev => ({ ...prev, [k]: e.target.value }))}
                        onFocus={() => setEditing(prev => ({ ...prev, [k]: String(t[field] ?? '') }))}
                        onBlur={() => handleBlur(t, field)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1">{l('asset.protection.hint', 'Click a cell to edit, press Tab or click away to save.')}</p>
    </div>
  )
}
