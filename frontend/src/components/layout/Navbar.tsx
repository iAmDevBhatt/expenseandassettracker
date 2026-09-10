import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLabels } from '../../hooks/useLabels'

export function Navbar() {
  const { username, logout } = useAuthStore()
  const { pathname } = useLocation()
  const { l } = useLabels()
  const [menuOpen, setMenuOpen] = useState(false)

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

  const mobileLinkCls = (to: string) =>
    `block px-4 py-3 text-sm font-medium transition-colors border-b border-primary-700 last:border-0 ${
      isActive(to)
        ? 'bg-primary-800 text-white'
        : 'text-primary-100 hover:bg-primary-700 hover:text-white'
    }`

  return (
    <nav className="bg-primary-800 shadow-md">
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

        {/* Mobile: hamburger button */}
        <button
          className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 ml-4"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden bg-primary-900 border-t border-primary-700">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={mobileLinkCls(link.to)}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-primary-100">
            <span>{username}</span>
            <button
              onClick={() => { setMenuOpen(false); logout() }}
              className="text-primary-200 hover:text-white transition-colors"
            >
              {l('nav.signout')}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
