import { useState, useRef, useEffect } from 'react'
import { useConfigStore } from '../../store/configStore'
import { useLabels } from '../../hooks/useLabels'
import type { ExpenseCreate } from '../../types'

export interface ExpenseFormValues {
  expense_date: string
  amount: string
  description: string
  paid_via_cc: string
  category: string
}

interface Props {
  /** 'addexpense' or 'editexpense' — selects which labels.properties keys are used */
  labelPrefix: 'addexpense' | 'editexpense'
  initial: ExpenseFormValues
  /** The month being viewed — drives the Today / Yesterday quick-pick chips */
  year: number
  month: number
  /** Categories to offer as one-tap chips (most-used first) */
  quickCategories: string[]
  pending: boolean
  errorMessage?: string | null
  /** Called with the payload; `addAnother` is true when "Save & add another" was used */
  onSubmit: (payload: ExpenseCreate, addAnother: boolean) => void
  onCancel: () => void
  /** Show a "Save & add another" button (add mode only) */
  allowAddAnother?: boolean
  /** Optional delete action shown in the footer (edit mode) */
  onDelete?: () => void
  /** Bumped by the parent after a successful "add another" to reset amount/description/category */
  resetKey?: number
  /** Short confirmation shown after a successful "add another" */
  flash?: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Default date for a new expense: today when viewing the current month, else the 1st of that month. */
export function defaultExpenseDate(year: number, month: number): string {
  const now = new Date()
  if (now.getFullYear() === year && now.getMonth() + 1 === month) return isoDate(now)
  return `${year}-${pad(month)}-01`
}

const chipCls = (active: boolean) =>
  `px-3 py-2 sm:py-1.5 rounded-full border text-sm transition-colors whitespace-nowrap ${
    active
      ? 'bg-primary-700 border-primary-700 text-white'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
  }`

export function ExpenseForm({
  labelPrefix, initial, year, month, quickCategories, pending, errorMessage,
  onSubmit, onCancel, allowAddAnother, onDelete, resetKey, flash,
}: Props) {
  const { configs } = useConfigStore()
  const { l } = useLabels()
  const p = labelPrefix

  const [form, setForm] = useState<ExpenseFormValues>(initial)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const submitModeRef = useRef<'close' | 'another'>('close')

  // After "Save & add another": keep date + payment method, clear the rest, refocus amount
  useEffect(() => {
    if (!resetKey) return
    setForm(prev => ({ ...prev, amount: '', description: '', category: '' }))
    setCategorySearch('')
    amountRef.current?.focus()
  }, [resetKey])

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  const setField = (field: keyof ExpenseFormValues, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const allCategories = configs?.EXPENSE_CATEGORY ?? []
  const filteredCategories = allCategories.filter(c =>
    c.value.toLowerCase().includes(categorySearch.toLowerCase()))
  // A category chosen via search that isn't among the quick chips still gets a chip, so the choice is visible
  const chipCategories = form.category && !quickCategories.includes(form.category)
    ? [form.category, ...quickCategories]
    : quickCategories

  const pickCategory = (value: string) => {
    setField('category', value)
    setCategorySearch('')
    setCategoryOpen(false)
  }

  // Today / Yesterday chips — only shown when they fall inside the month being viewed
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() + 1 === month
  const dateChips = [
    { label: l('expenseform.date.today', 'Today'), date: today },
    { label: l('expenseform.date.yesterday', 'Yesterday'), date: yesterday },
  ].filter(c => inMonth(c.date))

  const amountNum = parseFloat(form.amount)
  const valid = !!form.expense_date && amountNum > 0 && !!form.category

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || pending) return
    onSubmit(
      {
        expense_date: form.expense_date,
        amount: amountNum,
        description: form.description || undefined,
        paid_via_cc: form.paid_via_cc || null,
        category: form.category,
      },
      submitModeRef.current === 'another',
    )
    submitModeRef.current = 'close'
  }

  const cards = configs?.CREDIT_CARD ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {flash && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2" role="status">
          ✓ {flash}
        </p>
      )}

      {/* Amount — first and large, opens the numeric keypad on phones */}
      <div>
        <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700 mb-1">
          {l(`${p}.field.amount`)}
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-2xl text-gray-400 pointer-events-none">₹</span>
          <input
            id="expense-amount"
            ref={amountRef}
            type="number"
            inputMode="decimal"
            enterKeyHint="next"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setField('amount', e.target.value)}
            onKeyDown={e => {
              // "Next" on the keypad with no category yet: close the keyboard so the category chips are visible
              if (e.key === 'Enter' && !form.category) {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-3 text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={l(`${p}.field.amount.placeholder`, l('addexpense.field.amount.placeholder', '0.00'))}
            autoFocus={labelPrefix === 'addexpense'}
            required
          />
        </div>
      </div>

      {/* Category — one-tap chips for the usual suspects, searchable list for the rest */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{l(`${p}.field.category`)}</label>
        {chipCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {chipCategories.map(c => (
              <button key={c} type="button" className={chipCls(form.category === c)} onClick={() => pickCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div ref={categoryRef} className="relative">
          <input
            type="search"
            className="input-field"
            placeholder={form.category
              ? `${l('expenseform.category.selected', 'Selected')}: ${form.category}`
              : l(`${p}.field.category.placeholder`, 'Search category…')}
            value={categorySearch}
            onChange={e => { setCategorySearch(e.target.value); setCategoryOpen(true) }}
            onFocus={() => setCategoryOpen(true)}
            onKeyDown={e => {
              // Enter picks the first match instead of submitting the form
              if (e.key === 'Enter' && categoryOpen) {
                e.preventDefault()
                if (filteredCategories[0]) pickCategory(filteredCategories[0].value)
              }
            }}
            autoComplete="off"
            enterKeyHint="done"
          />
          {categoryOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto overscroll-contain">
              {filteredCategories.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`block w-full text-left px-3 py-3 sm:py-2 text-sm hover:bg-blue-50 ${form.category === c.value ? 'bg-blue-100 font-medium' : ''}`}
                  onClick={() => pickCategory(c.value)}
                >
                  {c.value}
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">{l('expenseform.category.nomatch', 'No matches')}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date — quick chips plus a native picker */}
      <div>
        <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700 mb-2">{l(`${p}.field.date`)}</label>
        <div className="flex flex-wrap items-center gap-2">
          {dateChips.map(c => (
            <button
              key={c.label}
              type="button"
              className={chipCls(form.expense_date === isoDate(c.date))}
              onClick={() => setField('expense_date', isoDate(c.date))}
            >
              {c.label}
            </button>
          ))}
          <input
            id="expense-date"
            type="date"
            value={form.expense_date}
            onChange={e => setField('expense_date', e.target.value)}
            className="input-field flex-1 min-w-[150px]"
            required
          />
        </div>
      </div>

      {/* Payment method — chips instead of a dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{l(`${p}.field.paidviacc`)}</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chipCls(!form.paid_via_cc)} onClick={() => setField('paid_via_cc', '')}>
            {l('expenseform.payment.none', 'Cash / UPI / Debit')}
          </button>
          {cards.map(c => (
            <button
              key={c.id}
              type="button"
              className={chipCls(form.paid_via_cc === c.value)}
              onClick={() => setField('paid_via_cc', c.value)}
            >
              💳 {c.value}
            </button>
          ))}
          {/* Keep an expense's existing card visible even if it was since removed from config */}
          {form.paid_via_cc && !cards.some(c => c.value === form.paid_via_cc) && (
            <button type="button" className={chipCls(true)}>💳 {form.paid_via_cc}</button>
          )}
        </div>
        {form.paid_via_cc && amountNum > 0 && (
          <p className="mt-2 text-xs text-blue-600">
            {l('addexpense.info.amountcc')} ₹{amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="expense-desc" className="block text-sm font-medium text-gray-700 mb-1">{l(`${p}.field.description`)}</label>
        <input
          id="expense-desc"
          type="text"
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          className="input-field"
          placeholder={l(`${p}.field.description.placeholder`, l('addexpense.field.description.placeholder', ''))}
          enterKeyHint="done"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      {/* Footer — sticks to the bottom of the sheet so the save button is always reachable */}
      <div className="sticky sheet-footer -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 bg-white border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn-secondary text-red-600 border-red-200 sm:mr-auto py-3 sm:py-2">
            {l('expenseform.button.delete', 'Delete')}
          </button>
        )}
        <button type="button" onClick={onCancel} className="btn-secondary py-3 sm:py-2 hidden sm:block">
          {l(`${p}.button.cancel`)}
        </button>
        {allowAddAnother && (
          <button
            type="submit"
            disabled={!valid || pending}
            onClick={() => { submitModeRef.current = 'another' }}
            className="btn-secondary py-3 sm:py-2 disabled:opacity-50"
          >
            {l('expenseform.button.addanother', 'Save & add another')}
          </button>
        )}
        <button
          type="submit"
          disabled={!valid || pending}
          onClick={() => { submitModeRef.current = 'close' }}
          className="btn-primary py-3 sm:py-2 text-base sm:text-sm"
        >
          {pending ? l(`${p}.button.submitting`) : l(`${p}.button.submit`)}
        </button>
      </div>
    </form>
  )
}
