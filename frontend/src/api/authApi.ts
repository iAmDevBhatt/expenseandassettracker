import api from './axiosInstance'
import type { LoginResponse, User } from '../types'

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { username, password })
  return data
}

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/api/auth/me')
  return data
}
