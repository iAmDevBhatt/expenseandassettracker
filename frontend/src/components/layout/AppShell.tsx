import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { InstallBanner } from './InstallBanner'

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 pt-6 sm:pt-10 pb-6">
        <InstallBanner />
        <Outlet />
      </main>
    </div>
  )
}
