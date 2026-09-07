import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLoanFYData, listLoanColumns, getLoanSettings, listLoansGiven } from '../api/loanApi'
import { getCurrentFY, getFYForYear } from '../utils/financialYear'
import { useConfigStore } from '../store/configStore'
import { useLabels } from '../hooks/useLabels'
import LoanSummary from '../components/loan/LoanSummary'
import LoansGivenTable from '../components/loan/LoansGivenTable'
import LoanLedgerTables from '../components/loan/LoanLedgerTables'

export default function LoanPage() {
  const { l } = useLabels()
  const { fyYear } = useParams<{ fyYear?: string }>()
  const navigate = useNavigate()
  const { configs, fetchConfigs } = useConfigStore()

  useEffect(() => { if (!configs) fetchConfigs() }, [configs, fetchConfigs])

  const currentFYStart = getCurrentFY().startYear
  const fyStartYear = fyYear ? parseInt(fyYear, 10) : currentFYStart
  const fy = getFYForYear(fyStartYear)
  const isCurrentFY = fyStartYear === currentFYStart

  const goToFY = (year: number) => navigate(`/loans/${year}`)

  const dataQ = useQuery({ queryKey: ['loan-data', fyStartYear], queryFn: () => getLoanFYData(fyStartYear) })
  const columnsQ = useQuery({ queryKey: ['loan-columns'], queryFn: listLoanColumns })
  const settingsQ = useQuery({ queryKey: ['loan-settings'], queryFn: getLoanSettings })
  const givenQ = useQuery({ queryKey: ['loans-given'], queryFn: listLoansGiven })

  const loading = dataQ.isLoading || columnsQ.isLoading || settingsQ.isLoading
  const error = dataQ.isError || columnsQ.isError || settingsQ.isError

  const loanAccountOptions = (configs?.LOAN_ACCOUNT ?? [])
    .filter(c => c.is_active)
    .map(c => c.value)

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header + FY navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mr-2">{l('loan.page.title', 'Loans')}</h2>

        <button
          className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => goToFY(fyStartYear - 1)}
          title={`Go to ${getFYForYear(fyStartYear - 1).label}`}
        >
          ‹ {getFYForYear(fyStartYear - 1).label}
        </button>

        <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">{fy.label}</span>

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
            {l('loan.page.currentfy', 'Current FY')}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-6 max-w-3xl">
        {l('loan.page.intro',
          'Track money you borrow from your own savings accounts and the interest you charge yourself. ' +
          'Unpaid balances roll forward into the next financial year automatically.')}
      </p>

      {loading && <div className="text-center py-12 text-gray-400">{l('common.loading', 'Loading…')}</div>}
      {error && <div className="text-center py-12 text-red-500">{l('common.error', 'Failed to load data. Please refresh.')}</div>}

      {!loading && !error && (
        <>
          <LoanSummary
            data={dataQ.data!}
            columns={columnsQ.data ?? []}
            interestPct={settingsQ.data?.personal_loan_interest_pct ?? null}
          />

          <LoansGivenTable given={givenQ.data ?? []} />

          <LoanLedgerTables
            fyStartYear={fyStartYear}
            data={dataQ.data!}
            columns={columnsQ.data ?? []}
            loanAccountOptions={loanAccountOptions}
          />
        </>
      )}
    </div>
  )
}
