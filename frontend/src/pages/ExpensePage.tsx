import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOrCreateMonth, listMonths } from '../api/monthApi'
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

  const { data: monthYear, isLoading: monthLoading } = useQuery({
    queryKey: ['month', currentYear, currentMonth],
    queryFn: () => getOrCreateMonth(currentYear, currentMonth),
  })

  const { data: months = [] } = useQuery({
    queryKey: ['months'],
    queryFn: listMonths,
  })

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', monthYear?.id],
    queryFn: () => getDashboard(monthYear!.id),
    enabled: !!monthYear,
  })

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split('-')
    navigate(`/expenses/${y}/${m}`)
  }

  const goToCurrentMonth = () => {
    const n = new Date()
    navigate(`/expenses/${n.getFullYear()}/${n.getMonth() + 1}`)
  }

  if (monthLoading) return <LoadingSpinner label={l('expensepage.loading.month')} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={`${currentYear}-${currentMonth}`}
            onChange={handleMonthChange}
            className="input-field w-48"
          >
            <option value={`${currentYear}-${currentMonth}`}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </option>
            {months
              .filter((m) => !(m.year === currentYear && m.month === currentMonth))
              .map((m) => (
                <option key={m.id} value={`${m.year}-${m.month}`}>
                  {MONTH_NAMES[m.month]} {m.year}
                </option>
              ))}
          </select>
          <button onClick={goToCurrentMonth} className="btn-secondary">
            {l('expensepage.button.currentmonth')}
          </button>
        </div>
      </div>

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
    </div>
  )
}
