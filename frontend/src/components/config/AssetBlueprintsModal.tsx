import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { createAssetBlueprint, updateAssetBlueprint, deleteAssetBlueprint } from '../../api/assetBlueprintApi'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { AssetBlueprint } from '../../types'

interface Props {
  blueprints: AssetBlueprint[]
  onClose: () => void
}

interface Row {
  key: string
  id: number | null
  name: string
  asset_category: string
  asset_sub_category: string
  asset_holder: string
  account_number: string
  sortOrder: number
}

const toRow = (b: AssetBlueprint): Row => ({
  key: `id-${b.id}`,
  id: b.id,
  name: b.name,
  asset_category: b.asset_category ?? '',
  asset_sub_category: b.asset_sub_category ?? '',
  asset_holder: b.asset_holder ?? '',
  account_number: b.account_number ?? '',
  sortOrder: b.sort_order,
})

export function AssetBlueprintsModal({ blueprints, onClose }: Props) {
  const qc = useQueryClient()
  const { configs } = useConfigStore()
  const { l } = useLabels()

  const categories = configs?.ASSET_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const subCategories = configs?.ASSET_SUB_CATEGORY?.filter(c => c.is_active).map(c => c.value) ?? []
  const holders = configs?.ASSET_HOLDER?.filter(c => c.is_active).map(c => c.value) ?? []

  const [rows, setRows] = useState<Row[]>(() => blueprints.map(toRow))
  const [newKey, setNewKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) => setRows(prev => prev.filter(r => r.key !== key))

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { key: `new-${newKey}`, id: null, name: '', asset_category: '', asset_sub_category: '', asset_holder: '', account_number: '', sortOrder: prev.length },
    ])
    setNewKey(k => k + 1)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const originalById = new Map(blueprints.map(b => [b.id, b]))
      const keptIds = new Set(rows.filter(r => r.id != null).map(r => r.id as number))

      for (const b of blueprints) {
        if (!keptIds.has(b.id)) await deleteAssetBlueprint(b.id)
      }

      for (const r of rows) {
        const name = r.name.trim()
        if (!name) continue
        const payload = {
          name,
          asset_category: r.asset_category || null,
          asset_sub_category: r.asset_sub_category || null,
          asset_holder: r.asset_holder || null,
          account_number: r.account_number.trim() || null,
          sort_order: r.sortOrder,
        }
        if (r.id == null) {
          await createAssetBlueprint(payload)
        } else {
          const orig = originalById.get(r.id)
          const changed = !orig ||
            orig.name !== payload.name ||
            orig.asset_category !== payload.asset_category ||
            orig.asset_sub_category !== payload.asset_sub_category ||
            orig.asset_holder !== payload.asset_holder ||
            orig.account_number !== payload.account_number ||
            orig.sort_order !== payload.sort_order
          if (changed) await updateAssetBlueprint(r.id, payload)
        }
      }

      qc.invalidateQueries({ queryKey: ['asset-blueprints'] })
      onClose()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? l('assetblueprints.modal.error', 'Failed to save changes.'))
      setSaving(false)
    }
  }

  return (
    <Modal title={l('assetblueprints.modal.title', 'Asset Blueprints')} onClose={saving ? () => {} : onClose} size="lg">
      <p className="text-sm text-gray-500 mb-3">
        {l('assetblueprints.modal.hint', 'Saved templates for your accounts. Use them from "+ Add Asset" on the Assets page to skip retyping the same details.')}
      </p>

      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 py-2">{l('assetblueprints.empty', 'No blueprints yet.')}</p>
        )}

        {rows.map(row => (
          <div key={row.key} className="border border-gray-200 rounded p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                onChange={e => patchRow(row.key, { name: e.target.value })}
                placeholder={l('assetblueprints.input.name', 'Name (e.g. HDFC Savings #1)')}
                className="input-field flex-1"
                autoFocus={row.key.startsWith('new-')}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-gray-300 hover:text-red-500 text-xl leading-none px-1"
                title={l('assetblueprints.button.remove.title', 'Remove')}
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                className="input-field text-sm"
                value={row.asset_category}
                onChange={e => patchRow(row.key, { asset_category: e.target.value })}
              >
                <option value="">— {l('assetblueprints.col.category', 'Category')}</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="input-field text-sm"
                value={row.asset_sub_category}
                onChange={e => patchRow(row.key, { asset_sub_category: e.target.value })}
              >
                <option value="">— {l('assetblueprints.col.subcat', 'Sub-Category')}</option>
                {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="input-field text-sm"
                value={row.asset_holder}
                onChange={e => patchRow(row.key, { asset_holder: e.target.value })}
              >
                <option value="">— {l('assetblueprints.col.holder', 'Holder')}</option>
                {holders.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                value={row.account_number}
                onChange={e => patchRow(row.key, { account_number: e.target.value })}
                placeholder={l('assetblueprints.col.account', 'Account #')}
                className="input-field text-sm"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-sm text-primary-700 hover:text-primary-900 font-medium"
        >
          {l('assetblueprints.modal.addrow', '+ Add Blueprint')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
        <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
          {l('assetblueprints.modal.cancel', 'Cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? l('assetblueprints.modal.saving', 'Saving…') : l('assetblueprints.modal.save', 'Save')}
        </button>
      </div>
    </Modal>
  )
}
