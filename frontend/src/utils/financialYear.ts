export type MonthKey = 'APR' | 'MAY' | 'JUN' | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC' | 'JAN' | 'FEB' | 'MAR'

export const MONTH_KEYS: MonthKey[] = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR']

export const MONTH_LABELS: Record<MonthKey, string> = {
  APR: 'Apr', MAY: 'May', JUN: 'Jun', JUL: 'Jul',
  AUG: 'Aug', SEP: 'Sep', OCT: 'Oct', NOV: 'Nov',
  DEC: 'Dec', JAN: 'Jan', FEB: 'Feb', MAR: 'Mar',
}

export interface FYInfo {
  label: string      // e.g. "FY 2025-26"
  startYear: number  // e.g. 2025
}

export function getCurrentFY(): FYInfo {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  const startYear = month >= 4 ? year : year - 1
  return {
    label: `FY ${startYear}-${String(startYear + 1).slice(2)}`,
    startYear,
  }
}

export function getFYForYear(startYear: number): FYInfo {
  return {
    label: `FY ${startYear}-${String(startYear + 1).slice(2)}`,
    startYear,
  }
}

export function listKnownFYs(assets: import('../types').AssetWithMonthly[]): number[] {
  const current = getCurrentFY().startYear
  const years = new Set<number>([current])
  for (const a of assets) {
    for (const mv of a.monthly_values) {
      if (mv.fy_start_year) years.add(mv.fy_start_year)
    }
  }
  return Array.from(years).sort((a, b) => b - a) // descending
}
