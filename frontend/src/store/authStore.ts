import { create } from 'zustand'

interface AuthState {
  token: string | null
  username: string | null
  isAuthenticated: boolean
  login: (token: string, username: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('tracker_token'),
  username: localStorage.getItem('tracker_username'),
  isAuthenticated: !!localStorage.getItem('tracker_token'),

  login: (token, username) => {
    localStorage.setItem('tracker_token', token)
    localStorage.setItem('tracker_username', username)
    set({ token, username, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('tracker_token')
    localStorage.removeItem('tracker_username')
    set({ token: null, username: null, isAuthenticated: false })
  },
}))
