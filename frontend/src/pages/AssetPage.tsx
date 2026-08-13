import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAssets,
  listProtectionTargets,
  initProtectionTargets,
  getLiquidAsset,
  initLiquidAsset,
  listPreciousMetals,
} from '../api/assetApi'
import { getCurrentFY, getFYForYear, listKnownFYs } from '../utils/financialYear'
import AssetSummaryTable from '../components/asset/AssetSummaryTable'
import AssetDetailsTable from '../components/asset/AssetDetailsTable'
import ProtectionTargetsTable from '../components/asset/ProtectionTargetsTable'
import LiquidAssetsTable from '../components/asset/LiquidAssetsTable'
import PreciousMetalsTable from '../components/asset/PreciousMetalsTable'
import { useLabels } from '../hooks/useLabels'

export default function AssetPage() {
  const { l } = useLabels()
  const { fyYear } = useParams<{ fyYear?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const currentFYStart = getCurrentFY().startYear
  const fyStartYear = fyYear ? parseInt(fyYear, 10) : currentFYStart
  const fy = getFYForYear(fyStartYear)

  const assetsQ = useQuery({ queryKey: ['assets'], queryFn: listAssets })
  const protectionQ = useQuery({ queryKey: ['protection-targets'], queryFn: listProtectionTargets })
  const liquidQ = useQuery({ queryKey: ['liquid-asset'], queryFn: getLiquidAsset })
  const metalsQ = useQuery({ queryKey: ['precious-metals'], queryFn: listPreciousMetals })

  const initProtectionMut = useMutation({
    mutationFn: initProtectionTargets,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['protection-targets'] }),
  })

  const initLiquidMut = useMutation({
    mutationFn: initLiquidAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquid-asset'] }),
  })

  const coreLoading = assetsQ.isLoading || metalsQ.isLoading
  const coreError = assetsQ.isError || metalsQ.isError

  const knownFYs = assetsQ.data ? listKnownFYs(assetsQ.data) : [currentFYStart]
  const isCurrentFY = fyStartYear === currentFYStart

  const goToFY = (year: number) => navigate(`/assets/${year}`)

  const protectionReady = !protectionQ.isLoading && (protectionQ.data?.length ?? 0) > 0
  const protectionMissing = !protectionQ.isLoading && (protectionQ.data?.length ?? 0) === 0
  const liquidReady = !liquidQ.isLoading && liquidQ.data != null
  const liquidMissing = !liquidQ.isLoading && liquidQ.data == null

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header + year navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mr-2">
          {l('asset.page.title', 'Assets')}
        </h2>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => goToFY(fyStartYear - 1)}
          title={`Go to FY ${fyStartYear - 1}-${String(fyStartYear).slice(2)}`}
        >
          ‹ {getFYForYear(fyStartYear - 1).label}
        </button>

        <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">
          {fy.label}
        </span>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear + 1)}
          title={`Go to FY ${fyStartYear + 1}-${String(fyStartYear + 2).slice(2)}`}
        >
          {getFYForYear(fyStartYear + 1).label} ›
        </button>

        {!isCurrentFY && (
          <button
            className="ml-2 px-3 py-1 rounded border border-blue-400 text-sm text-blue-600 hover:bg-blue-50"
            onClick={() => goToFY(currentFYStart)}
          >
            {l('asset.page.currentfy', 'Current FY')}
          </button>
        )}

        {knownFYs.length > 1 && (
          <select
            className="ml-2 text-sm border border-gray-300 rounded px-2 py-1"
            value={fyStartYear}
            onChange={e => goToFY(parseInt(e.target.value, 10))}
          >
            {knownFYs.map(y => (
              <option key={y} value={y}>{getFYForYear(y).label}</option>
            ))}
          </select>
        )}
      </div>

      {coreLoading && (
        <div className="text-center py-12 text-gray-400">{l('common.loading', 'Loading…')}</div>
      )}

      {coreError && (
        <div className="text-center py-12 text-red-500">{l('common.error', 'Failed to load data. Please refresh.')}</div>
      )}

      {!coreLoading && !coreError && (
        <>
          <AssetSummaryTable assets={assetsQ.data!} fyStartYear={fyStartYear} />
          <AssetDetailsTable assets={assetsQ.data!} fy={fy} fyStartYear={fyStartYear} />

          {/* Protection Targets — show placeholder until user initialises */}
          {protectionMissing && (
            <div className="mt-6 flex flex-col items-center justify-center py-10 gap-3 text-center border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                {l('asset.protection.notexists', 'Protection & Savings Targets not yet set up.')}
              </p>
              <button
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                onClick={() => initProtectionMut.mutate()}
                disabled={initProtectionMut.isPending}
              >
                {initProtectionMut.isPending
                  ? l('asset.protection.initialising', 'Setting up…')
                  : l('asset.protection.init', 'Set up Protection Targets')}
              </button>
              {initProtectionMut.isError && (
                <p className="text-red-500 text-sm">{l('asset.protection.init.error', 'Failed to set up.')}</p>
              )}
            </div>
          )}
          {protectionReady && <ProtectionTargetsTable targets={protectionQ.data!} />}

          {/* Liquid Assets — show placeholder until user initialises */}
          {liquidMissing && (
            <div className="mt-6 flex flex-col items-center justify-center py-10 gap-3 text-center border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                {l('asset.liquid.notexists', 'Liquid Assets tracking not yet set up.')}
              </p>
              <button
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                onClick={() => initLiquidMut.mutate()}
                disabled={initLiquidMut.isPending}
              >
                {initLiquidMut.isPending
                  ? l('asset.liquid.initialising', 'Setting up…')
                  : l('asset.liquid.init', 'Set up Liquid Assets')}
              </button>
              {initLiquidMut.isError && (
                <p className="text-red-500 text-sm">{l('asset.liquid.init.error', 'Failed to set up.')}</p>
              )}
            </div>
          )}
          {liquidReady && <LiquidAssetsTable data={liquidQ.data!} />}

          {metalsQ.data && <PreciousMetalsTable metals={metalsQ.data} />}
        </>
      )}
    </div>
  )
}
