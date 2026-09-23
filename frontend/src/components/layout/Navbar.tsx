import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLabels } from '../../hooks/useLabels'

export function Navbar() {
  const { username, logout } = useAuthStore()
  const { pathname } = useLocation()
  const { l } = useLabels()

  const isActive = (to: string) => pathname.startsWith(to)

  const navLinks = [
    { to: '/graphs', label: l('nav.graphs') },
    { to: '/budget', label: l('nav.budget') },
    { to: '/assets', label: l('nav.assets') },
    { to: '/loans', label: l('nav.loans') },
    { to: '/expenses', label: l('nav.expenses') },
    { to: '/users', label: l('nav.users') },
    { to: '/config', label: l('nav.configuration') },
  ]

  const desktopLinkCls = (to: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(to)
        ? 'bg-primary-800 text-white'
        : 'text-primary-100 hover:bg-primary-700 hover:text-white'
    }`

  return (
    <nav className="bg-primary-800 shadow-md pt-safe">
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo + app name */}
        <div className="flex items-center gap-1 shrink-0">
          <img
            src="/icons/icon-192.png"
            alt={l('app.logo.alt')}
            className="h-16 w-16 mr-2 shrink-0 relative z-10 translate-y-3 drop-shadow-lg"
          />
          <span className="text-white font-bold text-lg">{l('app.name')}</span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-1 ml-4">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={desktopLinkCls(link.to)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop user / logout */}
        <div className="hidden lg:flex items-center gap-3 text-sm text-primary-100 ml-4">
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
