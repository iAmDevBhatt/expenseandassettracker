import { useEffect } from 'react'
import { useConfigStore } from '../store/configStore'
import { ConfigList } from '../components/config/ConfigList'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useLabels } from '../hooks/useLabels'

export function ConfigPage() {
  const { configs, loading, fetchConfigs } = useConfigStore()
  const { l } = useLabels()

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  if (loading || !configs) return <LoadingSpinner label={l('configpage.loading')} />

  const LIST_CONFIG = [
    { key: 'EXPENSE_CATEGORY',  labelKey: 'configpage.list.expensecategory' },
    { key: 'CREDIT_CARD',       labelKey: 'configpage.list.creditcard' },
    { key: 'MONTHLY_MUST',      labelKey: 'configpage.list.monthlymust' },
    { key: 'TOTALLY_ESSENTIAL', labelKey: 'configpage.list.totallyessential' },
    { key: 'ASSET_CATEGORY',    labelKey: 'configpage.list.assetcategory' },
    { key: 'ASSET_HOLDER',      labelKey: 'configpage.list.assetholder' },
    { key: 'ASSET_SUB_CATEGORY',labelKey: 'configpage.list.assetsubcategory' },
    { key: 'IGNORE_CATEGORY',   labelKey: 'configpage.list.ignorecategory' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{l('configpage.heading')}</h1>
      <p className="text-sm text-gray-600">{l('configpage.description')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {LIST_CONFIG.map(({ key, labelKey }) => (
          <ConfigList
            key={key}
            listType={key}
            title={l(labelKey)}
            items={configs[key] ?? []}
          />
        ))}
      </div>
    </div>
  )
}
