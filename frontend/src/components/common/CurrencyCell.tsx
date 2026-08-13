interface Props {
  amount: number | null | undefined
  className?: string
}

export function CurrencyCell({ amount, className = '' }: Props) {
  if (amount == null) return <span className={className}>—</span>
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
  return <span className={className}>{formatted}</span>
}
