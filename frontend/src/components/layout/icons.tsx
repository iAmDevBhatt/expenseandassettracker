interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function ExpensesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
    </svg>
  )
}

export function BudgetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9" />
    </svg>
  )
}

export function AssetsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10 12 4l9 6" />
      <line x1="5" y1="10" x2="5" y2="19" />
      <line x1="9" y1="10" x2="9" y2="19" />
      <line x1="15" y1="10" x2="15" y2="19" />
      <line x1="19" y1="10" x2="19" y2="19" />
      <line x1="3" y1="19" x2="21" y2="19" />
    </svg>
  )
}

export function LoansIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h13" />
      <path d="M14 4l3 3-3 3" />
      <path d="M20 17H7" />
      <path d="M10 20l-3-3 3-3" />
    </svg>
  )
}

export function GraphsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="10" y1="20" x2="10" y2="8" />
      <line x1="15" y1="20" x2="15" y2="14" />
      <line x1="20" y1="20" x2="20" y2="5" />
    </svg>
  )
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.2c1.5.5 2.5 1.9 2.5 3.5s-1 3-2.5 3.5" />
      <path d="M21 20c0-2.8-2-5.1-4.7-5.8" />
    </svg>
  )
}

export function ConfigIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.8-1.4-2-3.4-2.1.6a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2.2a7.6 7.6 0 0 0-2.6 1.5l-2.1-.6-2 3.4L4.6 10a7.5 7.5 0 0 0 0 3l-1.8 1.5 2 3.4 2.1-.6c.75.68 1.63 1.2 2.6 1.5L10 22h4l.5-2.2c.97-.3 1.85-.82 2.6-1.5l2.1.6 2-3.4z" />
    </svg>
  )
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M16 8l4 4-4 4" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}
