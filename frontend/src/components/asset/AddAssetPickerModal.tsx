import { Modal } from '../common/Modal'
import { useLabels } from '../../hooks/useLabels'
import type { AssetBlueprint } from '../../types'

interface Props {
  blueprints: AssetBlueprint[]
  onPick: (blueprint: AssetBlueprint | null) => void
  onClose: () => void
}

export default function AddAssetPickerModal({ blueprints, onPick, onClose }: Props) {
  const { l } = useLabels()

  return (
    <Modal title={l('addasset.modal.title', 'Add Asset')} onClose={onClose}>
      <div className="space-y-4">
        {blueprints.length === 0 ? (
          <p className="text-sm text-gray-500">
            {l(
              'addasset.modal.noblueprints',
              'No saved blueprints yet. Set some up under Configuration → Asset Blueprints to skip retyping the same account details next time.',
            )}
          </p>
        ) : (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {l('addasset.modal.pickblueprint', 'Pick a saved blueprint')}
            </p>
            <div className="border border-gray-200 rounded divide-y max-h-64 overflow-y-auto">
              {blueprints.map(bp => (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => onPick(bp)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-800">{bp.name}</div>
                  <div className="text-xs text-gray-400">
                    {[bp.asset_holder, bp.asset_category, bp.asset_sub_category, bp.account_number]
                      .filter(Boolean)
                      .join(' · ') || l('addasset.modal.nodetails', 'No details set')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onPick(null)}
          className="w-full px-4 py-2 rounded border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          {l('addasset.modal.custom', '+ Add custom (blank row)')}
        </button>

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {l('addasset.modal.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
