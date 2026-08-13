import api from './axiosInstance'
import type { User } from '../types'

export const listUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/api/users')
  return data
}

export const createUser = async (username: string, password: string): Promise<User> => {
  const { data } = await api.post<User>('/api/users', { username, password })
  return data
}

export const updateUser = async (id: number, payload: { username?: string; password?: string }): Promise<User> => {
  const { data } = await api.put<User>(`/api/users/${id}`, payload)
  return data
}

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/api/users/${id}`)
}
