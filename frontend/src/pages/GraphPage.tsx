import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getMonthlyBreakdown, getMonthlySummary, getBudgetActuals, getBudgetEntries } from '../api/budgetApi'
import { listAssets } from '../api/assetApi'
import { getCurrentFY, getFYForYear, MONTH_KEYS } from '../utils/financialYear'
import { useConfigStore } from '../store/configStore'
import { useLabels } from '../hooks/useLabels'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CHART_COLORS = [
  '#4f86c6', '#e07b39', '#5aaa6b', '#c94f4f', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16',
  '#f97316', '#06b6d4', '#a78bfa', '#34d399', '#fb923c',
]

function formatINR(value: unknown) {
  const n = Number(value)
  if (!isFinite(n)) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
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

  const categories = (configs?.EXPENSE_CATEGORY ?? []).filter(c => c.is_active).map(c => c.value)

  // ── Chart 1: Monthly Expenses by Category (Stacked Bar) ──
  const breakdownData = (breakdownQ.data ?? []).map(item => {
    const label = `${MONTH_SHORT[item.month]}`
    return { name: label, ...item.categories }
  })

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

  const noData = <p className="text-sm text-gray-400 py-8 text-center">{l('graph.nodata')}</p>

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
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

      {/* Chart 1: Monthly Expenses by Category */}
      <ChartCard title={l('graph.chart.monthlybycategory')}>
        {breakdownQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
          : breakdownData.length === 0 ? noData
          : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={breakdownData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {categories.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Chart 2: Category Breakdown Donut */}
      <ChartCard title={l('graph.chart.categorybreakdown')}>
        {actualsQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
          : pieData.length === 0 ? noData
          : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="actual"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={130}
                    label={({ category, percent }: { category: string; percent: number }) =>
                      `${category} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 min-w-[200px] text-sm">
                {pieData.map((item, i) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-700 truncate">{item.category}</span>
                    <span className="ml-auto text-gray-500 font-mono">{formatINR(item.actual)}</span>
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Income" stroke="#4f86c6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Spending" stroke="#c94f4f" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Investment" stroke="#5aaa6b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Chart 5: Projected vs Actual by Category */}
      <ChartCard title={l('graph.chart.projectedvsactual')}>
        {entriesQ.isLoading || actualsQ.isLoading
          ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
          : budgetVsActualData.length === 0 ? noData
          : (
            <ResponsiveContainer width="100%" height={360}>
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
                <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Projected" fill="#4f86c6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill="#e07b39" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Chart 4: Asset Value Growth */}
      <ChartCard title={l('graph.chart.assetgrowth')}>
        {assetsQ.isLoading ? <p className="text-sm text-gray-400">{l('common.loading')}</p>
          : assetData.every(d => d.total === 0) ? noData
          : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={assetData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f86c6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f86c6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total Asset Value"
                  stroke="#4f86c6"
                  fill="url(#assetGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </ChartCard>
    </div>
  )
}
