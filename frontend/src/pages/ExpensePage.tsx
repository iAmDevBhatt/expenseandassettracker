import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checkMonth, createMonth } from '../api/monthApi'
import { getDashboard } from '../api/dashboardApi'
import { ExpenseTable } from '../components/expense/ExpenseTable'
import { CategorySummaryTable } from '../components/expense/CategorySummaryTable'
import { OperatingCashFlowTable } from '../components/expense/OperatingCashFlowTable'
import { FinancialSummaryTable } from '../components/expense/FinancialSummaryTable'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useConfigStore } from '../store/configStore'
import { useLabels } from '../hooks/useLabels'

export function ExpensePage() {
  const { year: yearParam, month: monthParam } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { configs, fetchConfigs } = useConfigStore()
  const { l } = useLabels()

  useEffect(() => {
    if (!configs) fetchConfigs()
  }, [configs, fetchConfigs])

  const now = new Date()
  const currentYear = yearParam ? parseInt(yearParam) : now.getFullYear()
  const currentMonth = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const MONTH_NAMES = [
    '',
    l('month.january'), l('month.february'), l('month.march'), l('month.april'),
    l('month.may'), l('month.june'), l('month.july'), l('month.august'),
    l('month.september'), l('month.october'), l('month.november'), l('month.december'),
  ]

  // Check if this month exists — does NOT create it
  const { data: monthYear, isLoading: monthLoading } = useQuery({
    queryKey: ['month-check', currentYear, currentMonth],
    queryFn: () => checkMonth(currentYear, currentMonth),
    retry: false,
  })

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', monthYear?.id],
    queryFn: () => getDashboard(monthYear!.id),
    enabled: !!monthYear,
  })

  // Explicit create
  const createMut = useMutation({
    mutationFn: () => createMonth(currentYear, currentMonth),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['month-check', currentYear, currentMonth] })
      qc.invalidateQueries({ queryKey: ['months'] })
    },
  })

  // Navigation helpers
  const goPrev = () => {
    const m = currentMonth === 1 ? 12 : currentMonth - 1
    const y = currentMonth === 1 ? currentYear - 1 : currentYear
    navigate(`/expenses/${y}/${m}`)
  }
  const goNext = () => {
    const m = currentMonth === 12 ? 1 : currentMonth + 1
    const y = currentMonth === 12 ? currentYear + 1 : currentYear
    navigate(`/expenses/${y}/${m}`)
  }
  const goToCurrentMonth = () => {
    const n = new Date()
    navigate(`/expenses/${n.getFullYear()}/${n.getMonth() + 1}`)
  }

  // Year picker range: 60 years back to 60 years forward
  const baseYear = now.getFullYear()
  const yearOptions: number[] = []
  for (let y = baseYear + 60; y >= baseYear - 60; y--) yearOptions.push(y)

  const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1
  const monthExists = monthYear != null

  return (
    <div className="space-y-6">
      {/* Navigation header */}
      <div className="flex flex-wrap items-center gap-4">

        {/* Prev / label / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg leading-none"
            title="Previous month"
          >
            ‹
          </button>
          <span className={`px-3 py-1 rounded font-semibold text-base min-w-[160px] text-center ${
            monthExists ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goNext}
            className="px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg leading-none"
            title="Next month"
          >
            ›
          </button>
        </div>

        {/* Jump to — month + year selects */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{l('expensepage.nav.jumpto', 'Jump to:')}</span>
          <select
            className="input-field w-32"
            value={currentMonth}
            onChange={e => navigate(`/expenses/${currentYear}/${e.target.value}`)}
          >
            {MONTH_NAMES.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            className="input-field w-24"
            value={currentYear}
            onChange={e => navigate(`/expenses/${e.target.value}/${currentMonth}`)}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Current month shortcut */}
        {!isCurrentMonth && (
          <button onClick={goToCurrentMonth} className="btn-secondary">
            {l('expensepage.button.currentmonth')}
          </button>
        )}
      </div>

      {/* Month not yet created — show placeholder */}
      {monthLoading && <LoadingSpinner label={l('expensepage.loading.month')} />}

      {!monthLoading && !monthExists && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-gray-500 text-lg">
            {l('expensepage.month.notexists', 'No data for')} <strong>{MONTH_NAMES[currentMonth]} {currentYear}</strong>.
          </p>
          <p className="text-gray-400 text-sm">
            {l('expensepage.month.notexists.hint', 'Click the button below to start tracking this month.')}
          </p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            {createMut.isPending
              ? l('expensepage.month.creating', 'Creating…')
              : `${l('expensepage.month.create', 'Start')} ${MONTH_NAMES[currentMonth]} ${currentYear}`}
          </button>
          {createMut.isError && (
            <p className="text-red-500 text-sm">{l('expensepage.month.create.error', 'Failed to create month.')}</p>
          )}
        </div>
      )}

      {/* Month exists — show data */}
      {!monthLoading && monthExists && (
        <>
          {monthYear && <ExpenseTable monthYearId={monthYear.id} />}

          {dashLoading ? (
            <LoadingSpinner label={l('expensepage.loading.dashboard')} />
          ) : dashboard ? (
            <div className="grid gap-6">
              <OperatingCashFlowTable monthYearId={monthYear!.id} rows={dashboard.cash_flow} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CategorySummaryTable rows={dashboard.category_summary} />
                <FinancialSummaryTable summary={dashboard.financial_summary} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
