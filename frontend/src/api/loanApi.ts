import api from './axiosInstance'
import type {
  LoanSettings,
  LoanColumn,
  LoanFYData,
  LoanEntry,
  LoanGiven,
  LoanGivenUpsert,
} from '../types'

// ── Settings ────────────────────────────────────────────────────────────────
export const getLoanSettings = () =>
  api.get<LoanSettings>('/api/loans/settings').then(r => r.data)

export const updateLoanSettings = (personal_loan_interest_pct: number | null) =>
  api.put<LoanSettings>('/api/loans/settings', { personal_loan_interest_pct }).then(r => r.data)

// ── Account columns ─────────────────────────────────────────────────────────
export const listLoanColumns = () =>
  api.get<LoanColumn[]>('/api/loans/columns').then(r => r.data)

export const addLoanColumn = (name: string) =>
  api.post<LoanColumn>('/api/loans/columns', { name }).then(r => r.data)

export const deleteLoanColumn = (id: number) =>
  api.delete(`/api/loans/columns/${id}`)

// ── Ledger (Withdrawn / Credited) ───────────────────────────────────────────
export const getLoanFYData = (fyStartYear: number) =>
  api.get<LoanFYData>(`/api/loans/${fyStartYear}/data`).then(r => r.data)

export const createLoanEntry = (fyStartYear: number, side: 'WITHDRAWN' | 'CREDITED', entry_date: string | null) =>
  api.post<LoanEntry>(`/api/loans/${fyStartYear}/entries`, { side, entry_date }).then(r => r.data)

export const updateLoanEntry = (entryId: number, entry_date: string | null) =>
  api.put<LoanEntry>(`/api/loans/entries/${entryId}`, { entry_date }).then(r => r.data)

export const deleteLoanEntry = (entryId: number) =>
  api.delete(`/api/loans/entries/${entryId}`)

export const upsertLoanAmount = (entryId: number, accountName: string, amount: number | null) =>
  api.put<LoanEntry>(
    `/api/loans/entries/${entryId}/amounts/${encodeURIComponent(accountName)}`,
    { amount },
  ).then(r => r.data)

// ── Loans given (bad debt) ──────────────────────────────────────────────────
export const listLoansGiven = () =>
  api.get<LoanGiven[]>('/api/loans/given').then(r => r.data)

export const createLoanGiven = (data: LoanGivenUpsert) =>
  api.post<LoanGiven>('/api/loans/given', data).then(r => r.data)

export const updateLoanGiven = (id: number, data: LoanGivenUpsert) =>
  api.put<LoanGiven>(`/api/loans/given/${id}`, data).then(r => r.data)

export const deleteLoanGiven = (id: number) =>
  api.delete(`/api/loans/given/${id}`)
