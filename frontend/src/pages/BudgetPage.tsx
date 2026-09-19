import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBudgetEntries,
  saveBudgetEntries,
  getBudgetActuals,
  getBudgetSummary,
  saveBudgetSummary,
  copyBudgetFromPreviousFY,
} from '../api/budgetApi'
import { getCurrentFY, getFYForYear } from '../utils/financialYear'
import { useConfigStore } from '../store/configStore'
import { updateConfigItem } from '../api/configApi'
import { useLabels } from '../hooks/useLabels'
import BudgetCategoryTable from '../components/budget/BudgetCategoryTable'
import BudgetSummaryTable from '../components/budget/BudgetSummaryTable'
import type { BudgetEntryUpsert, BudgetSummary } from '../types'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function BudgetPage() {
  const { l } = useLabels()
  const { fyYear } = useParams<{ fyYear?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { configs, fetchConfigs, invalidate } = useConfigStore()

  useEffect(() => { if (!configs) fetchConfigs() }, [configs, fetchConfigs])

  const currentFYStart = getCurrentFY().startYear
  const fyStartYear = fyYear ? parseInt(fyYear, 10) : currentFYStart
  const fy = getFYForYear(fyStartYear)

  // Default range: April fyStartYear → March fyStartYear+1
  const [startYear, setStartYear] = useState(fyStartYear)
  const [startMonth, setStartMonth] = useState(4)
  const [endYear, setEndYear] = useState(fyStartYear + 1)
  const [endMonth, setEndMonth] = useState(3)

  // Sync range when FY changes via URL
  useEffect(() => {
    setStartYear(fyStartYear)
    setStartMonth(4)
    setEndYear(fyStartYear + 1)
    setEndMonth(3)
  }, [fyStartYear])

  const goToFY = (year: number) => navigate(`/budget/${year}`)

  const categoryItems = (configs?.EXPENSE_CATEGORY ?? [])
    .filter(c => c.is_active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  const categories = categoryItems.map(c => c.value)

  // Reordering is stored on the EXPENSE_CATEGORY config's sort_order — shared globally
  // across every FY, same as the dropdown ordering elsewhere in the app.
  const reorderCategories = async (draggedValue: string, targetValue: string) => {
    if (draggedValue === targetValue) return
    const order = categories.slice()
    const from = order.indexOf(draggedValue)
    if (from === -1 || order.indexOf(targetValue) === -1) return
    order.splice(from, 1)
    order.splice(order.indexOf(targetValue), 0, draggedValue)

    const byValue = new Map(categoryItems.map(c => [c.value, c]))
    const updates = order
      .map((value, idx) => ({ item: byValue.get(value)!, sortOrder: idx }))
      .filter(({ item, sortOrder }) => item.sort_order !== sortOrder)

    await Promise.all(updates.map(({ item, sortOrder }) =>
      updateConfigItem('EXPENSE_CATEGORY', item.id, item.value, sortOrder)
    ))
    invalidate()
    await fetchConfigs()
  }

  const entriesQ = useQuery({
    queryKey: ['budget-entries', fyStartYear],
    queryFn: () => getBudgetEntries(fyStartYear),
  })

  const actualsQ = useQuery({
    queryKey: ['budget-actuals', fyStartYear, startYear, startMonth, endYear, endMonth],
    queryFn: () => getBudgetActuals(fyStartYear, startYear, startMonth, endYear, endMonth),
  })

  const summaryQ = useQuery({
    queryKey: ['budget-summary', fyStartYear],
    queryFn: () => getBudgetSummary(fyStartYear),
  })

  const saveEntriesMut = useMutation({
    mutationFn: (entries: BudgetEntryUpsert[]) => saveBudgetEntries(fyStartYear, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-entries', fyStartYear] }),
  })

  const saveSummaryMut = useMutation({
    mutationFn: (data: Partial<BudgetSummary>) => saveBudgetSummary(fyStartYear, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-summary', fyStartYear] }),
  })

  const copyFromPrevMut = useMutation({
    mutationFn: () => copyBudgetFromPreviousFY(fyStartYear),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-entries', fyStartYear] }),
  })

  const prevFYLabel = getFYForYear(fyStartYear - 1).label
  const isEmptyFY = !entriesQ.isLoading && (entriesQ.data?.length ?? 0) === 0

  const baseYear = currentFYStart
  const yearOptions: number[] = []
  for (let y = baseYear - 5; y <= baseYear + 5; y++) yearOptions.push(y)

  const isCurrentFY = fyStartYear === currentFYStart

  return (
    <div className="p-3 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header + FY navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mr-2">{l('budget.page.title')}</h2>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear - 1)}
          title={`Go to ${getFYForYear(fyStartYear - 1).label}`}
        >
          ‹ {getFYForYear(fyStartYear - 1).label}
        </button>

        <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">
          {fy.label}
        </span>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear + 1)}
          title={`Go to ${getFYForYear(fyStartYear + 1).label}`}
        >
          {getFYForYear(fyStartYear + 1).label} ›
        </button>

        {!isCurrentFY && (
          <button
            className="px-2 py-1 rounded border border-blue-400 text-sm text-blue-600 hover:bg-blue-50"
            onClick={() => goToFY(currentFYStart)}
          >
            {l('budget.page.currentfy')}
          </button>
        )}

        <button
          className="ml-auto px-3 py-1 rounded border border-emerald-500 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          onClick={() => copyFromPrevMut.mutate()}
          disabled={copyFromPrevMut.isPending}
          title={`Copy all categories from ${prevFYLabel} into this FY (skips categories already added)`}
        >
          {copyFromPrevMut.isPending ? 'Copying…' : `⬇ Copy from ${prevFYLabel}`}
        </button>
      </div>

      {/* Empty-state prompt when no entries yet */}
      {isEmptyFY && !copyFromPrevMut.isPending && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-emerald-800">
            No budget categories yet for this FY. Pull in last year's categories to get started quickly.
          </p>
          <button
            className="shrink-0 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            onClick={() => copyFromPrevMut.mutate()}
          >
            Copy from {prevFYLabel}
          </button>
        </div>
      )}

      {copyFromPrevMut.isError && (
        <p className="text-sm text-red-500 mb-3">Failed to copy — please try again.</p>
      )}
      {copyFromPrevMut.isSuccess && (
        <p className="text-sm text-emerald-600 mb-3">Categories copied from {prevFYLabel}. You can now edit the amounts.</p>
      )}

      {/* Date range controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">{l('budget.range.label')}:</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">{l('budget.range.start')}:</span>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={startMonth}
            onChange={e => setStartMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{MONTH_SHORT[m]}</option>
            ))}
          </select>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={startYear}
            onChange={e => setStartYear(parseInt(e.target.value))}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <span className="text-sm text-gray-500">{l('budget.range.to')}</span>

          <span className="text-sm text-gray-500">{l('budget.range.end')}:</span>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={endMonth}
            onChange={e => setEndMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{MONTH_SHORT[m]}</option>
            ))}
          </select>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={endYear}
            onChange={e => setEndYear(parseInt(e.target.value))}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-gray-400">
            {MONTH_NAMES[startMonth]} {startYear} – {MONTH_NAMES[endMonth]} {endYear}
          </span>
        </div>
      </div>

      {/* Budget category table */}
      {entriesQ.isLoading || actualsQ.isLoading ? (
        <p className="text-sm text-gray-400 mb-4">{l('common.loading')}</p>
      ) : entriesQ.isError || actualsQ.isError ? (
        <p className="text-sm text-red-500 mb-4">{l('common.error')}</p>
      ) : (
        <BudgetCategoryTable
          key={fyStartYear}
          categories={categories}
          entries={entriesQ.data ?? []}
          actuals={actualsQ.data?.actuals ?? []}
          onSave={entries => saveEntriesMut.mutate(entries)}
          onReorder={reorderCategories}
          saving={saveEntriesMut.isPending}
        />
      )}

      {/* Budget summary table */}
      {summaryQ.isLoading ? (
        <p className="text-sm text-gray-400">{l('common.loading')}</p>
      ) : summaryQ.isError ? (
        <p className="text-sm text-red-500">{l('common.error')}</p>
      ) : (
        <BudgetSummaryTable
          summary={summaryQ.data ?? null}
          entries={entriesQ.data ?? []}
          totalActual={actualsQ.data?.total_actual ?? 0}
          onSave={data => saveSummaryMut.mutate(data)}
        />
      )}
    </div>
  )
}
