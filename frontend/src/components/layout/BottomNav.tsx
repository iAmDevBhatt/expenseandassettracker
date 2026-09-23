import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLabels } from '../../hooks/useLabels'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { Modal } from '../common/Modal'
import {
  ExpensesIcon, BudgetIcon, AssetsIcon, LoansIcon, GraphsIcon, MoreIcon,
  UsersIcon, ConfigIcon, SignOutIcon, DownloadIcon,
} from './icons'

const TABS = [
  { to: '/expenses', label: 'nav.expenses', Icon: ExpensesIcon },
  { to: '/budget', label: 'nav.budget', Icon: BudgetIcon },
  { to: '/assets', label: 'nav.assets', Icon: AssetsIcon },
  { to: '/loans', label: 'nav.loans', Icon: LoansIcon },
  { to: '/graphs', label: 'nav.graphs', Icon: GraphsIcon },
]

/** Fixed icon tab bar for phones/tablets; the desktop top nav takes over at lg. */
export function BottomNav() {
  const { pathname } = useLocation()
  const { l } = useLabels()
  const { username, logout } = useAuthStore()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (to: string) => pathname.startsWith(to)
  const tabCls = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${
      active ? 'text-primary-700' : 'text-gray-500'
    }`

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-6">
          {TABS.map(({ to, label, Icon }) => {
            const active = isActive(to)
            return (
              <Link key={to} to={to} className={tabCls(active)}>
                <Icon className={`h-5 w-5 ${active ? 'text-primary-700' : 'text-gray-400'}`} />
                <span className="truncate max-w-full px-0.5">{l(label)}</span>
              </Link>
            )
          })}
          <button onClick={() => setMoreOpen(true)} className={tabCls(false)}>
            <MoreIcon className="h-5 w-5 text-gray-400" />
            <span>{l('nav.more', 'More')}</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <Modal title={l('nav.more', 'More')} onClose={() => setMoreOpen(false)} size="sm">
          <div className="flex flex-col -mx-4 sm:-mx-6">
            <Link
              to="/users"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100"
            >
              <UsersIcon className="h-5 w-5 text-gray-500" />
              {l('nav.users')}
            </Link>
            <Link
              to="/config"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100"
            >
              <ConfigIcon className="h-5 w-5 text-gray-500" />
              {l('nav.configuration')}
            </Link>
            {canInstall && (
              <button
                onClick={() => { setMoreOpen(false); promptInstall() }}
                className="flex items-center gap-3 px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100"
              >
                <DownloadIcon className="h-5 w-5 text-gray-500" />
                {l('install.menu', 'Install app')}
              </button>
            )}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <span className="text-sm text-gray-500">{username}</span>
              <button
                onClick={() => { setMoreOpen(false); logout() }}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <SignOutIcon className="h-5 w-5 text-gray-500" />
                {l('nav.signout')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
