import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLabels } from '../../hooks/useLabels'

export function Navbar() {
  const { username, logout } = useAuthStore()
  const { pathname } = useLocation()
  const { l } = useLabels()

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname.startsWith(to)
          ? 'bg-primary-800 text-white'
          : 'text-primary-100 hover:bg-primary-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-primary-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="text-white font-bold text-lg mr-4">{l('app.name')}</span>
          {navLink('/graphs', l('nav.graphs'))}
          {navLink('/budget', l('nav.budget'))}
          {navLink('/assets', l('nav.assets'))}
          {navLink('/expenses', l('nav.expenses'))}
          {navLink('/users', l('nav.users'))}
          {navLink('/config', l('nav.configuration'))}
        </div>
        <div className="flex items-center gap-3 text-sm text-primary-100">
          <span>{username}</span>
          <button
            onClick={logout}
            className="text-primary-200 hover:text-white transition-colors"
          >
            {l('nav.signout')}
          </button>
        </div>
      </div>
    </nav>
  )
}
