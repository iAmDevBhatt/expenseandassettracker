import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import { useLabels } from '../hooks/useLabels'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { l } = useLabels()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await loginApi(username, password)
      login(response.token, response.username)
      navigate('/expenses')
    } catch {
      setError(l('login.error.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-800">{l('app.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{l('app.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('login.field.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l('login.field.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? l('login.button.submitting') : l('login.button.submit')}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          {l('login.hint.defaultcreds')}
        </p>
      </div>
    </div>
  )
}
