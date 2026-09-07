import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../common/Modal'
import { getLoanSettings, updateLoanSettings } from '../../api/loanApi'
import { useLabels } from '../../hooks/useLabels'

interface Props {
  onClose: () => void
}

export function LoanSettingsModal({ onClose }: Props) {
  const { l } = useLabels()
  const qc = useQueryClient()
  const settingsQ = useQuery({ queryKey: ['loan-settings'], queryFn: getLoanSettings })

  const [draft, setDraft] = useState<string | null>(null)
  const stored = settingsQ.data?.personal_loan_interest_pct
  const value = draft !== null ? draft : (stored != null ? String(stored) : '')

  const saveMut = useMutation({
    mutationFn: (v: number | null) => updateLoanSettings(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-settings'] })
      onClose()
    },
  })

  const handleSave = () => {
    const raw = (draft ?? value).trim()
    const v = raw === '' ? null : Number(raw)
    saveMut.mutate(v != null && Number.isNaN(v) ? null : v)
  }

  return (
    <Modal title={l('configpage.list.loansettings', 'Loan Settings')} onClose={onClose} size="sm">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {l('configpage.loan.interestpct', 'Personal Loan Interest %')}
      </label>
      <input
        type="number"
        step="0.01"
        className="input-field w-full"
        placeholder="0.00"
        value={value}
        disabled={settingsQ.isLoading}
        onChange={e => setDraft(e.target.value)}
        autoFocus
      />
      <p className="text-xs text-gray-400 mt-2">
        {l('configpage.loan.interestpct.hint',
          'Monthly interest rate you charge yourself on outstanding self-loans.')}
      </p>

      {saveMut.isError && (
        <p className="text-sm text-red-600 mt-2">
          {l('configpage.loan.interestpct.error', 'Failed to save.')}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-4 mt-3 border-t">
        <button type="button" onClick={onClose} disabled={saveMut.isPending} className="btn-secondary">
          {l('configlist.modal.cancel', 'Cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={saveMut.isPending || settingsQ.isLoading} className="btn-primary">
          {saveMut.isPending ? l('configlist.modal.saving', 'Saving…') : l('configlist.modal.save', 'Save')}
        </button>
      </div>
    </Modal>
  )
}
