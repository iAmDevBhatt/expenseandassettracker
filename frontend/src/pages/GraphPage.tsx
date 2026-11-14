import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getMonthlyBreakdown, getMonthlySummary, getBudgetActuals, getBudgetEntries } from '../api/budgetApi'
import { listAssets, getLiquidAsset, listPreciousMetals, getMetalPrice, listProtectionTargets } from '../api/assetApi'
import { listLoanColumns, listLoansGiven, getLoanFYData, getLoanSettings } from '../api/loanApi'
import { getCurrentFY, getFYForYear, MONTH_KEYS, MONTH_LABELS, type MonthKey } from '../utils/financialYear'
import { useConfigStore } from '../store/configStore'
import { useLabels } from '../hooks/useLabels'
import type { LoanEntry } from '../types'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CHART_COLORS = [
  '#4f86c6', '#e07b39', '#5aaa6b', '#c94f4f', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16',
  '#f97316', '#06b6d4', '#a78bfa', '#34d399', '#fb923c',
]

const METAL_PRICE_KEY_MAP: Record<string, string> = { Gold: 'gold', Silver: 'silver', 'Gold Bar': 'gold_bar' }

function formatINR(value: unknown) {
  const n = Number(value)
  if (!isFinite(n)) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function ChartCard({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 ${className}`}>
      <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4">{title}</h3>
      {children}
    </div>
  )
}

type Status = 'good' | 'warning' | 'critical' | 'neutral'

const STATUS_CLS: Record<Status, string> = {
  good: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
  neutral: '',
}

function StatTile({ label, value, status, statusLabel }: {
  label: string
  value: string
  status?: Status
  statusLabel?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{value}</div>
      {statusLabel && status && status !== 'neutral' && (
        <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[status]}`}>
          {statusLabel}
        </span>
      )}
    </div>
  )
}

const sideSum = (entries: LoanEntry[], acct: string) =>
  entries.reduce((s, e) => s + (e.amounts[acct] ?? 0), 0)

function MeterRow({ label, current, target }: { label: string; current: number; target: number | null }) {
  const pct = target != null && target > 0 ? Math.min(100, (current / target) * 100) : null
  const reached = pct != null && pct >= 100
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">
          {formatINR(current)}{target != null && target > 0 ? ` / ${formatINR(target)}` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${reached ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct ?? (current > 0 ? 100 : 0)}%` }}
        />
      </div>
    </div>
  )
}

export default function GraphPage() {
  const { l } = useLabels()
  const { fyYear } = useParams<{ fyYear?: string }>()
  const navigate = useNavigate()
  const { configs, fetchConfigs } = useConfigStore()

  useEffect(() => { if (!configs) fetchConfigs() }, [configs, fetchConfigs])

  const currentFYStart = getCurrentFY().startYear
  const fyStartYear = fyYear ? parseInt(fyYear, 10) : currentFYStart
  const fy = getFYForYear(fyStartYear)
  const isCurrentFY = fyStartYear === currentFYStart

  const goToFY = (year: number) => navigate(`/graphs/${year}`)

  const breakdownQ = useQuery({
    queryKey: ['monthly-breakdown', fyStartYear],
    queryFn: () => getMonthlyBreakdown(fyStartYear),
  })

  const summaryQ = useQuery({
    queryKey: ['monthly-summary', fyStartYear],
    queryFn: () => getMonthlySummary(fyStartYear),
  })

  const actualsQ = useQuery({
    queryKey: ['budget-actuals-graph', fyStartYear, 4, fyStartYear, 3, fyStartYear + 1],
    queryFn: () => getBudgetActuals(fyStartYear, fyStartYear, 4, fyStartYear + 1, 3),
  })

  const assetsQ = useQuery({ queryKey: ['assets'], queryFn: listAssets })

  const entriesQ = useQuery({
    queryKey: ['budget-entries', fyStartYear],
    queryFn: () => getBudgetEntries(fyStartYear),
  })

  // ── Dashboard KPI data — always "right now", independent of the FY selector above ──
  const liquidQ = useQuery({ queryKey: ['liquid-asset'], queryFn: getLiquidAsset })
  const metalsQ = useQuery({ queryKey: ['precious-metals'], queryFn: listPreciousMetals })
  const uniqueMetalTypes = [...new Set((metalsQ.data ?? []).map(m => m.metal_type).filter(Boolean) as string[])]
  const metalPricesQ = useQuery({
    queryKey: ['metal-prices-dashboard', uniqueMetalTypes.join(',')],
    queryFn: async () => {
      const results: Record<string, number | null> = {}
      await Promise.all(uniqueMetalTypes.map(mt =>
        getMetalPrice(METAL_PRICE_KEY_MAP[mt] ?? mt.toLowerCase())
          .then(r => { results[mt] = r.price_per_gram })
          .catch(() => { results[mt] = null })
      ))
      return results
    },
    staleTime: 5 * 60 * 1000,
    enabled: uniqueMetalTypes.length > 0,
  })
  const loanColumnsQ = useQuery({ queryKey: ['loan-columns'], queryFn: listLoanColumns })
  const loanNowQ = useQuery({ queryKey: ['loan-data', currentFYStart], queryFn: () => getLoanFYData(currentFYStart) })
  const loansGivenQ = useQuery({ queryKey: ['loans-given'], queryFn: listLoansGiven })
  const loanSettingsQ = useQuery({ queryKey: ['loan-settings'], queryFn: getLoanSettings })
  const protectionQ = useQuery({ queryKey: ['protection-targets'], queryFn: listProtectionTargets })

  const now = new Date()
  const thisCalendarYear = now.getFullYear()
  const thisCalendarMonth = now.getMonth() + 1
  const thisMonthActualsQ = useQuery({
    queryKey: ['budget-actuals-thismonth', thisCalendarYear, thisCalendarMonth],
    queryFn: () => getBudgetActuals(currentFYStart, thisCalendarYear, thisCalendarMonth, thisCalendarYear, thisCalendarMonth),
  })

  const categories = (configs?.EXPENSE_CATEGORY ?? []).filter(c => c.is_active).map(c => c.value)

  // ── KPI: Net Worth — latest filled-in asset snapshot + liquid assets + precious metals ──
  const { latestAssetTotal, latestSnapshotLabel, assetCategoryAllocation } = useMemo(() => {
    const assets = assetsQ.data ?? []
    const totalsByOrder = new Map<number, number>()
    const categoryTotalsByOrder = new Map<number, Map<string, number>>()
    for (const asset of assets) {
      const cat = asset.asset_category ?? 'Uncategorized'
      for (const mv of asset.monthly_values) {
        if (mv.amount == null) continue
        const order = mv.fy_start_year * 12 + MONTH_KEYS.indexOf(mv.month_key as MonthKey)
        totalsByOrder.set(order, (totalsByOrder.get(order) ?? 0) + Number(mv.amount))
        if (!categoryTotalsByOrder.has(order)) categoryTotalsByOrder.set(order, new Map())
        const catMap = categoryTotalsByOrder.get(order)!
        catMap.set(cat, (catMap.get(cat) ?? 0) + Number(mv.amount))
      }
    }
    if (totalsByOrder.size === 0) {
      return { latestAssetTotal: 0, latestSnapshotLabel: null as string | null, assetCategoryAllocation: [] as { category: string; value: number }[] }
    }
    const maxOrder = Math.max(...totalsByOrder.keys())
    const fyOf = Math.floor(maxOrder / 12)
    const monthKey = MONTH_KEYS[maxOrder % 12]
    const catMap = categoryTotalsByOrder.get(maxOrder) ?? new Map()
    return {
      latestAssetTotal: totalsByOrder.get(maxOrder) ?? 0,
      latestSnapshotLabel: `${MONTH_LABELS[monthKey]}, ${getFYForYear(fyOf).label}`,
      assetCategoryAllocation: Array.from(catMap.entries()).map(([category, value]) => ({ category, value })),
    }
  }, [assetsQ.data])

  const liquidTotal = liquidQ.data
    ? Number(liquidQ.data.current_fixed ?? 0) + Number(liquidQ.data.current_savings ?? 0) + Number(liquidQ.data.current_cash ?? 0)
    : 0

  const metalsTotal = useMemo(() => {
    const priceMap = metalPricesQ.data ?? {}
    return (metalsQ.data ?? []).reduce((sum, m) => {
      if (m.current_value_override != null) return sum + Number(m.current_value_override)
      const price = m.metal_type ? priceMap[m.metal_type] : null
      if (price != null && m.grams != null) return sum + price * Number(m.grams)
      return sum
    }, 0)
  }, [metalsQ.data, metalPricesQ.data])

  const netWorth = latestAssetTotal + liquidTotal + metalsTotal
  const netWorthReady = !assetsQ.isLoading && !liquidQ.isLoading && !metalsQ.isLoading

  // ── Asset Allocation — asset categories + liquid assets + precious metals, so it sums to Net Worth ──
  const assetAllocation = useMemo(() => {
    const rows = [...assetCategoryAllocation]
    if (liquidTotal > 0) rows.push({ category: 'Liquid Assets', value: liquidTotal })
    if (metalsTotal > 0) rows.push({ category: 'Precious Metals', value: metalsTotal })
    return rows.sort((a, b) => b.value - a.value)
  }, [assetCategoryAllocation, liquidTotal, metalsTotal])

  // ── KPI: Self-loan outstanding (owed to your own accounts, as of today) ──
  const selfLoanOutstanding = useMemo(() => {
    if (!loanNowQ.data || !loanColumnsQ.data) return null
    const data = loanNowQ.data
    return loanColumnsQ.data.reduce((sum, col) => {
      const priorW = data.prior[col.name]?.withdrawn ?? 0
      const priorC = data.prior[col.name]?.credited ?? 0
      const fyW = sideSum(data.withdrawn, col.name)
      const fyC = sideSum(data.credited, col.name)
      return sum + (priorW + fyW - priorC - fyC)
    }, 0)
  }, [loanNowQ.data, loanColumnsQ.data])

  // ── KPI: Monthly interest cost of the self-loan outstanding, at the configured rate ──
  const selfLoanInterestMonthly =
    loanSettingsQ.data?.personal_loan_interest_pct != null && selfLoanOutstanding != null
      ? (loanSettingsQ.data.personal_loan_interest_pct / 100) * selfLoanOutstanding
      : null

  // ── KPI: Money lent to others, still outstanding ──
  const lentOutOutstanding = (loansGivenQ.data ?? []).reduce(
    (s, r) => s + (Number(r.loan_amount ?? 0) - Number(r.paid_amount ?? 0)), 0,
  )

  // ── KPI: FY income / spending / investment / savings rate — respects the FY selector ──
  const fyTotals = useMemo(() => {
    const rows = summaryQ.data ?? []
    const income = rows.reduce((s, r) => s + Number(r.income), 0)
    const spending = rows.reduce((s, r) => s + Number(r.spending), 0)
    const investment = rows.reduce((s, r) => s + Number(r.investment), 0)
    const savingsRate = income > 0 ? ((income - spending) / income) * 100 : null
    return { income, spending, investment, savingsRate }
  }, [summaryQ.data])

  // ── Chart 1: Monthly Expenses by Category (Stacked Bar) ──
  const breakdownData = (breakdownQ.data ?? []).map(item => {
    const label = `${MONTH_SHORT[item.month]}`
    return { name: label, ...item.categories }
  })
  // Only plot categories that actually have spend this FY — with 70+ configured
  // categories, an unfiltered legend overflows its container and overlaps content below it.
  const categoriesWithData = categories.filter(cat =>
    breakdownData.some(row => Number((row as Record<string, unknown>)[cat] ?? 0) > 0)
  )

  // ── Chart 2: Category Breakdown (Donut/Pie) ──
  const pieData = (actualsQ.data?.actuals ?? [])
    .filter(a => a.actual > 0)
    .sort((a, b) => b.actual - a.actual)

  // ── Chart 3: Income vs Spending vs Investment (Line) ──
  const lineData = (summaryQ.data ?? []).map(item => ({
    name: MONTH_SHORT[item.month],
    Income: Number(item.income),
    Spending: Number(item.spending),
    Investment: Number(item.investment),
  }))

  // ── Chart 4: Asset Value Growth (Area) ──
  const MONTH_KEY_TO_NUM: Record<string, number> = {
    APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9,
    OCT: 10, NOV: 11, DEC: 12, JAN: 1, FEB: 2, MAR: 3,
  }

  const assetData = MONTH_KEYS.map(key => {
    const monthNum = MONTH_KEY_TO_NUM[key]
    const total = (assetsQ.data ?? []).reduce((sum, asset) => {
      const mv = asset.monthly_values.find(
        v => v.month_key === key && v.fy_start_year === fyStartYear
      )
      return sum + (mv?.amount ?? 0)
    }, 0)
    return { name: `${MONTH_SHORT[monthNum]}`, total }
  })

  // ── Chart 5: Projected vs Actual by Category ──
  const budgetVsActualData = (() => {
    const actualsMap: Record<string, number> = {}
    for (const a of (actualsQ.data?.actuals ?? [])) actualsMap[a.category] = a.actual
    return (entriesQ.data ?? [])
      .map(e => ({
        category: e.category,
        Projected: Number(e.amount_per_month) * e.qty,
        Actual: actualsMap[e.category] ?? 0,
      }))
      .filter(row => row.Projected > 0 || row.Actual > 0)
      .sort((a, b) => b.Projected - a.Projected)
  })()

  // ── KPI: Budget health — how many budgeted categories are over their projection this FY ──
  const budgetHealth = useMemo(() => {
    const budgeted = budgetVsActualData.filter(r => r.Projected > 0)
    const over = budgeted.filter(r => r.Actual > r.Projected).length
    return { over, total: budgeted.length }
  }, [budgetVsActualData])

  // ── Top spending categories this (real) calendar month ──
  const topCategoriesThisMonth = (thisMonthActualsQ.data?.actuals ?? [])
    .filter(a => a.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 5)
  const topCategoriesMax = Math.max(1, ...topCategoriesThisMonth.map(c => c.actual))

  const noData = <p className="text-sm text-gray-400 py-8 text-center">{l('graph.nodata')}</p>

  return (
    <div className="p-3 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header + FY navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mr-2">{l('graph.page.title')}</h2>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear - 1)}
        >
          ‹ {getFYForYear(fyStartYear - 1).label}
        </button>

        <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">
          {fy.label}
        </span>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear + 1)}
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
      </div>

      {/* Net Worth — the one hero figure on this dashboard */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
        <div className="text-xs sm:text-sm text-gray-500">
          {l('graph.kpi.networth', 'Net Worth')}
          {latestSnapshotLabel && (
            <span className="text-gray-400"> · {l('graph.kpi.networth.asof', 'as of')} {latestSnapshotLabel}</span>
          )}
        </div>
        <div className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1">
          {netWorthReady ? formatINR(netWorth) : '…'}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {l('graph.kpi.networth.hint', 'Asset accounts + Liquid Assets + Precious Metals. Self-loans excluded (money just moved between your own accounts).')}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatTile
          label={l('graph.kpi.income', 'Income (this FY)')}
          value={formatINR(fyTotals.income)}
        />
        <StatTile
          label={l('graph.kpi.spending', 'Spending (this FY)')}
          value={formatINR(fyTotals.spending)}
          status={fyTotals.spending > fyTotals.income ? 'critical' : 'neutral'}
          statusLabel={fyTotals.spending > fyTotals.income ? l('graph.kpi.overincome', 'Over income') : undefined}
        />
        <StatTile
          label={l('graph.kpi.investment', 'Investment (this FY)')}
          value={formatINR(fyTotals.investment)}
        />
        <StatTile
          label={l('graph.kpi.savingsrate', 'Savings Rate')}
          value={fyTotals.savingsRate != null ? `${fyTotals.savingsRate.toFixed(0)}%` : '—'}
          status={
            fyTotals.savingsRate == null ? 'neutral'
              : fyTotals.savingsRate < 0 ? 'critical'
              : fyTotals.savingsRate < 15 ? 'warning' : 'good'
          }
          statusLabel={
            fyTotals.savingsRate == null ? undefined
              : fyTotals.savingsRate < 0 ? l('graph.kpi.savingsrate.over', 'Overspending')
              : fyTotals.savingsRate < 15 ? l('graph.kpi.savingsrate.low', 'Low')
              : l('graph.kpi.savingsrate.healthy', 'Healthy')
          }
        />
        <StatTile
          label={l('graph.kpi.selfloan', 'Self-Loan Outstanding')}
          value={selfLoanOutstanding != null ? formatINR(selfLoanOutstanding) : '—'}
          status={selfLoanOutstanding == null ? 'neutral' : selfLoanOutstanding > 0 ? 'warning' : 'good'}
          statusLabel={
            selfLoanOutstanding == null ? undefined
              : selfLoanOutstanding > 0 ? l('graph.kpi.selfloan.owed', 'Owed to yourself')
              : l('graph.kpi.selfloan.clear', 'Clear')
          }
        />
        <StatTile
          label={l('graph.kpi.lentout', 'Money Lent Out')}
          value={formatINR(lentOutOutstanding)}
          status={lentOutOutstanding > 0 ? 'warning' : 'good'}
          statusLabel={lentOutOutstanding > 0 ? l('graph.kpi.lentout.pending', 'Awaiting repayment') : l('graph.kpi.lentout.clear', 'All settled')}
        />
        <StatTile
          label={l('graph.kpi.budgethealth', 'Budget Health (this FY)')}
          value={budgetHealth.total > 0
            ? `${budgetHealth.total - budgetHealth.over}/${budgetHealth.total} ${l('graph.kpi.budgethealth.onbudget', 'on budget')}`
            : '—'}
          status={budgetHealth.total === 0 ? 'neutral' : budgetHealth.over === 0 ? 'good' : budgetHealth.over <= budgetHealth.total / 3 ? 'warning' : 'critical'}
          statusLabel={budgetHealth.total === 0 ? undefined
            : budgetHealth.over === 0 ? l('graph.kpi.budgethealth.allgood', 'All within budget')
            : l('graph.kpi.budgethealth.overcount', '{n} over').replace('{n}', String(budgetHealth.over))}
        />
        <StatTile
          label={l('graph.kpi.selfloaninterest', 'Self-Loan Interest (Monthly)')}
          value={selfLoanInterestMonthly != null ? formatINR(selfLoanInterestMonthly) : '—'}
          status={selfLoanInterestMonthly == null ? 'neutral' : selfLoanInterestMonthly > 0 ? 'warning' : 'good'}
          statusLabel={
            loanSettingsQ.data && loanSettingsQ.data.personal_loan_interest_pct == null
              ? l('graph.kpi.selfloaninterest.notset', 'Rate not set')
              : undefined
          }
        />
      </div>

      {/* Chart grid — dashboard layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 1: Monthly Expenses by Category */}
        <ChartCard title={l('graph.chart.monthlybycategory')} className="md:col-span-2">
          {breakdownQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : breakdownData.length === 0 ? noData
            : (
              <>
                <div className="h-[260px] sm:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} width={44} />
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                      {categoriesWithData.map((cat, i) => (
                        <Bar key={cat} dataKey={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {l('graph.chart.monthlybycategory.hint', '{n} categories with spend this FY. Hover a bar segment for the category and amount.')
                    .replace('{n}', String(categoriesWithData.length))}
                </p>
              </>
            )}
        </ChartCard>

        {/* Asset Allocation — ranked horizontal bars (categories + liquid + precious metals, sums to Net Worth) */}
        <ChartCard title={l('graph.chart.allocation', 'Asset Allocation')}>
          {!netWorthReady ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : assetAllocation.length === 0 ? noData
            : (
              <>
                <div style={{ height: Math.max(120, assetAllocation.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={assetAllocation}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatINR} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                      <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {latestSnapshotLabel && (
                  <p className="text-xs text-gray-400 mt-2">
                    {l('graph.chart.allocation.hint', 'Asset accounts as of {label}, plus current Liquid Assets and Precious Metals.')
                      .replace('{label}', latestSnapshotLabel)}
                  </p>
                )}
              </>
            )}
        </ChartCard>

        {/* Top spending categories this (real) calendar month */}
        <ChartCard title={l('graph.chart.topcategories', 'Top Categories This Month')}>
          {thisMonthActualsQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : topCategoriesThisMonth.length === 0 ? noData
            : (
              <div className="space-y-3">
                {topCategoriesThisMonth.map(c => (
                  <div key={c.category}>
                    <div className="flex justify-between items-baseline text-xs mb-1">
                      <span className="text-gray-600 truncate">{c.category}</span>
                      <span className="text-gray-500">{formatINR(c.actual)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.actual / topCategoriesMax) * 100}%`, background: CHART_COLORS[1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </ChartCard>

        {/* Chart 2: Category Breakdown Donut */}
        <ChartCard title={l('graph.chart.categorybreakdown')}>
          {actualsQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : pieData.length === 0 ? noData
            : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-[240px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="actual"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        label={false}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1 w-full text-sm max-h-40 overflow-y-auto">
                  {pieData.map((item, i) => (
                    <div key={item.category} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-gray-700 truncate">{item.category}</span>
                      <span className="ml-auto text-gray-500 font-mono text-xs">{formatINR(item.actual)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </ChartCard>

        {/* Chart 3: Income vs Spending vs Investment */}
        <ChartCard title={l('graph.chart.incomevsexpense')}>
          {summaryQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : lineData.length === 0 ? noData
            : (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} width={44} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Income" stroke="#4f86c6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Spending" stroke="#c94f4f" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Investment" stroke="#5aaa6b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>

        {/* Chart 5: Projected vs Actual by Category */}
        <ChartCard title={l('graph.chart.projectedvsactual')} className="md:col-span-2">
          {entriesQ.isLoading || actualsQ.isLoading
            ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : budgetVsActualData.length === 0 ? noData
            : (
              <div className="overflow-x-auto">
                <div
                  className="h-[320px] sm:h-[360px]"
                  style={{ minWidth: Math.max(budgetVsActualData.length * 70, 320) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={budgetVsActualData}
                      margin={{ top: 4, right: 16, left: 8, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} width={44} />
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Projected" fill="#4f86c6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Actual" fill="#e07b39" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
        </ChartCard>

        {/* Savings & Protection Targets + Liquid Assets — progress meters */}
        <ChartCard title={l('graph.chart.targets', 'Savings & Protection Targets')} className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">{l('asset.protection.title', 'Protection & Savings Targets')}</p>
              {protectionQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
                : (protectionQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">{l('graph.chart.targets.protectionnotset', 'Not set up yet — see the Assets page.')}</p>
                ) : (
                  protectionQ.data!.map(t => (
                    <MeterRow key={t.id} label={t.category} current={Number(t.current_value ?? 0)} target={t.target_value != null ? Number(t.target_value) : null} />
                  ))
                )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">{l('asset.liquid.title', 'Liquid Assets')}</p>
              {liquidQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
                : !liquidQ.data ? (
                  <p className="text-sm text-gray-400">{l('graph.chart.targets.liquidnotset', 'Not set up yet — see the Assets page.')}</p>
                ) : (
                  <>
                    <MeterRow label={l('asset.liquid.col.fixed', 'Fixed')} current={Number(liquidQ.data.current_fixed ?? 0)} target={liquidQ.data.target_fixed != null ? Number(liquidQ.data.target_fixed) : null} />
                    <MeterRow label={l('asset.liquid.col.savings', 'Savings')} current={Number(liquidQ.data.current_savings ?? 0)} target={liquidQ.data.target_savings != null ? Number(liquidQ.data.target_savings) : null} />
                    <MeterRow label={l('asset.liquid.col.cash', 'Cash')} current={Number(liquidQ.data.current_cash ?? 0)} target={liquidQ.data.target_cash != null ? Number(liquidQ.data.target_cash) : null} />
                  </>
                )}
            </div>
          </div>
        </ChartCard>

        {/* Chart 4: Asset Value Growth */}
        <ChartCard title={l('graph.chart.assetgrowth')} className="md:col-span-2">
          {assetsQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
            : assetData.every(d => d.total === 0) ? noData
            : (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={assetData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f86c6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f86c6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} width={44} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Area
                      type="linear"
                      dataKey="total"
                      name="Total Asset Value"
                      stroke="#4f86c6"
                      fill="url(#assetGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>
      </div>
    </div>
  )
}
