import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { ExpensePage } from './pages/ExpensePage'
import { ConfigPage } from './pages/ConfigPage'
import { UserManagementPage } from './pages/UserManagementPage'
import AssetPage from './pages/AssetPage'
import BudgetPage from './pages/BudgetPage'
import GraphPage from './pages/GraphPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/expenses" replace />} />
          <Route path="expenses" element={<ExpensePage />} />
          <Route path="expenses/:year/:month" element={<ExpensePage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="assets" element={<AssetPage />} />
          <Route path="assets/:fyYear" element={<AssetPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="budget/:fyYear" element={<BudgetPage />} />
          <Route path="graphs" element={<GraphPage />} />
          <Route path="graphs/:fyYear" element={<GraphPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
