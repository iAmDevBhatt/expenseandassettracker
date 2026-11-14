import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useConfigStore } from '../store/configStore'
import { ConfigListModal } from '../components/config/ConfigListModal'
import { LoanSettingsModal } from '../components/config/LoanSettingsModal'
import { AssetBlueprintsModal } from '../components/config/AssetBlueprintsModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { getLoanSettings } from '../api/loanApi'
import { listAssetBlueprints } from '../api/assetBlueprintApi'
import { useLabels } from '../hooks/useLabels'

const LIST_CONFIG = [
  { key: 'EXPENSE_CATEGORY',   labelKey: 'configpage.list.expensecategory' },
  { key: 'CREDIT_CARD',        labelKey: 'configpage.list.creditcard' },
  { key: 'MONTHLY_MUST',       labelKey: 'configpage.list.monthlymust' },
  { key: 'TOTALLY_ESSENTIAL',  labelKey: 'configpage.list.totallyessential' },
  { key: 'ASSET_CATEGORY',     labelKey: 'configpage.list.assetcategory' },
  { key: 'ASSET_HOLDER',       labelKey: 'configpage.list.assetholder' },
  { key: 'ASSET_SUB_CATEGORY', labelKey: 'configpage.list.assetsubcategory' },
  { key: 'IGNORE_CATEGORY',    labelKey: 'configpage.list.ignorecategory' },
  { key: 'LOAN_ACCOUNT',       labelKey: 'configpage.list.loanaccount' },
]

const LOAN_SETTINGS = '__loan_settings__'
const ASSET_BLUEPRINTS = '__asset_blueprints__'

export function ConfigPage() {
  const { configs, loading, fetchConfigs } = useConfigStore()
  const { l } = useLabels()
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const loanSettingsQ = useQuery({ queryKey: ['loan-settings'], queryFn: getLoanSettings })
  const blueprintsQ = useQuery({ queryKey: ['asset-blueprints'], queryFn: listAssetBlueprints })

  if (loading || !configs) return <LoadingSpinner label={l('configpage.loading')} />

  const openList = LIST_CONFIG.find(c => c.key === open)
  const pct = loanSettingsQ.data?.personal_loan_interest_pct

  const Row = ({
    label,
    detail,
    onClick,
  }: { label: string; detail: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 px-4 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <span className="flex items-center gap-3 text-gray-400">
        <span className="text-xs">{detail}</span>
        <span className="text-lg leading-none">›</span>
      </span>
    </button>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{l('configpage.heading')}</h1>
        <p className="text-sm text-gray-600 mt-1">{l('configpage.description')}</p>
      </div>

      <div className="card !p-0 divide-y divide-gray-100 overflow-hidden">
        {LIST_CONFIG.map(({ key, labelKey }) => (
          <Row
            key={key}
            label={l(labelKey)}
            detail={l('configpage.row.items', '{n} items').replace(
              '{n}',
              String((configs[key] ?? []).length),
            )}
            onClick={() => setOpen(key)}
          />
        ))}
        <Row
          label={l('configpage.list.loansettings', 'Loan Settings')}
          detail={pct != null ? `${pct}%` : l('configpage.loan.notset', 'Not set')}
          onClick={() => setOpen(LOAN_SETTINGS)}
        />
        <Row
          label={l('configpage.list.assetblueprints', 'Asset Blueprints')}
          detail={l('configpage.row.items', '{n} items').replace(
            '{n}',
            String(blueprintsQ.data?.length ?? 0),
          )}
          onClick={() => setOpen(ASSET_BLUEPRINTS)}
        />
      </div>

      {openList && (
        <ConfigListModal
          listType={openList.key}
          title={l(openList.labelKey)}
          items={configs[openList.key] ?? []}
          onClose={() => setOpen(null)}
        />
      )}

      {open === LOAN_SETTINGS && <LoanSettingsModal onClose={() => setOpen(null)} />}

      {open === ASSET_BLUEPRINTS && (
        <AssetBlueprintsModal blueprints={blueprintsQ.data ?? []} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
