import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { addConfigItem, updateConfigItem, deleteConfigItem } from '../../api/configApi'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { ConfigItem } from '../../types'

interface Props {
  listType: string
  title: string
  items: ConfigItem[]
  onClose: () => void
}

interface Row {
  key: string
  id: number | null
  value: string
  sortOrder: number
}

export function ConfigListModal({ listType, title, items, onClose }: Props) {
  const qc = useQueryClient()
  const { fetchConfigs, invalidate } = useConfigStore()
  const { l } = useLabels()

  const [rows, setRows] = useState<Row[]>(() =>
    items.map(i => ({ key: `id-${i.id}`, id: i.id, value: i.value, sortOrder: i.sort_order })),
  )
  const [newKey, setNewKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setValue = (key: string, value: string) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, value } : r)))

  const removeRow = (key: string) =>
    setRows(prev => prev.filter(r => r.key !== key))

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { key: `new-${newKey}`, id: null, value: '', sortOrder: prev.length },
    ])
    setNewKey(k => k + 1)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const originalById = new Map(items.map(i => [i.id, i.value]))
      const keptIds = new Set(rows.filter(r => r.id != null).map(r => r.id as number))

      // Deletions
      for (const i of items) {
        if (!keptIds.has(i.id)) await deleteConfigItem(listType, i.id)
      }
      // Renames
      for (const r of rows) {
        if (r.id == null) continue
        const v = r.value.trim()
        if (v && v !== originalById.get(r.id)) {
          await updateConfigItem(listType, r.id, v, r.sortOrder)
        }
      }
      // Additions
      for (const r of rows) {
        if (r.id != null) continue
        const v = r.value.trim()
        if (v) await addConfigItem(listType, v)
      }

      invalidate()
      await fetchConfigs()
      qc.invalidateQueries({ queryKey: ['config'] })
      onClose()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? l('configlist.modal.error', 'Failed to save changes.'))
      setSaving(false)
    }
  }

  return (
    <Modal title={title} onClose={saving ? () => {} : onClose} size="lg">
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 py-2">{l('configlist.empty', 'No items yet.')}</p>
        )}

        {rows.map(row => (
          <div key={row.key} className="flex items-center gap-2">
            <input
              type="text"
              value={row.value}
              onChange={e => setValue(row.key, e.target.value)}
              placeholder={l('configlist.input.placeholder', 'Add new item…')}
              className="input-field flex-1"
              autoFocus={row.key.startsWith('new-')}
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="text-gray-300 hover:text-red-500 text-xl leading-none px-1"
              title={l('configlist.button.remove.title', 'Remove')}
            >
              &times;
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-sm text-primary-700 hover:text-primary-900 font-medium mt-1"
        >
          {l('configlist.modal.additem', '+ Add item')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
        <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
          {l('configlist.modal.cancel', 'Cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? l('configlist.modal.saving', 'Saving…') : l('configlist.modal.save', 'Save')}
        </button>
      </div>
    </Modal>
  )
}
