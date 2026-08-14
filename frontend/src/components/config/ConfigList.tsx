import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { addConfigItem, deleteConfigItem } from '../../api/configApi'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { ConfigItem } from '../../types'

interface Props {
  listType: string
  title: string
  items: ConfigItem[]
}

export function ConfigList({ listType, title, items }: Props) {
  const { invalidate, fetchConfigs } = useConfigStore()
  const { l } = useLabels()
  const [newValue, setNewValue] = useState('')
  const [error, setError] = useState('')

  const addMutation = useMutation({
    mutationFn: () => addConfigItem(listType, newValue.trim()),
    onSuccess: () => {
      setNewValue('')
      setError('')
      invalidate()
      fetchConfigs()
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? l('configlist.error'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteConfigItem(listType, id),
    onSuccess: () => {
      invalidate()
      fetchConfigs()
    },
  })

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newValue.trim()) addMutation.mutate() }}
          placeholder={l('configlist.input.placeholder')}
          className="input-field flex-1"
        />
        <button
          onClick={() => { if (newValue.trim()) addMutation.mutate() }}
          disabled={!newValue.trim() || addMutation.isPending}
          className="btn-primary whitespace-nowrap"
        >
          {l('configlist.button.add')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">{item.value}</span>
            <button
              onClick={() => deleteMutation.mutate(item.id)}
              className="text-gray-300 hover:text-red-500 text-lg leading-none ml-2"
              title={l('configlist.button.remove.title')}
            >
              &times;
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-gray-400 py-2">{l('configlist.empty')}</li>
        )}
      </ul>
    </div>
  )
}
