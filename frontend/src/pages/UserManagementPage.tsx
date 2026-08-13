import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsers, createUser, updateUser, deleteUser } from '../api/userApi'
import { Modal } from '../components/common/Modal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useAuthStore } from '../store/authStore'
import { useLabels } from '../hooks/useLabels'
import type { User } from '../types'

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const { username: currentUsername } = useAuthStore()
  const { l } = useLabels()

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const addMutation = useMutation({
    mutationFn: () => createUser(newUsername.trim(), newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewUsername('')
      setNewPassword('')
      setAddError('')
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 3000)
    },
    onError: (err: any) => {
      setAddError(err?.response?.data?.detail ?? 'Failed to add user')
      setAddSuccess(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: { username?: string; password?: string } = {}
      if (editUsername.trim()) payload.username = editUsername.trim()
      if (editPassword) payload.password = editPassword
      return updateUser(editingUser!.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditError('')
      setEditSuccess(true)
      setTimeout(() => {
        setEditingUser(null)
        setEditSuccess(false)
      }, 1500)
    },
    onError: (err: any) => {
      setEditError(err?.response?.data?.detail ?? 'Failed to update user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const openEdit = (user: User) => {
    setEditingUser(user)
    setEditUsername('')
    setEditPassword('')
    setEditError('')
    setEditSuccess(false)
  }

  const handleDelete = (user: User) => {
    if (window.confirm(l('usermgmt.confirm.delete'))) {
      deleteMutation.mutate(user.id)
    }
  }

  const addValid = newUsername.trim() && newPassword

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{l('usermgmt.heading')}</h1>

      {/* User list */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="table-cell font-medium">{l('usermgmt.table.col.username')}</th>
                <th className="table-cell font-medium w-32">{l('usermgmt.table.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="table-cell">
                    {user.username}
                    {user.username === currentUsername && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        {l('usermgmt.action.edit')}
                      </button>
                      {user.username !== currentUsername && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-gray-400 hover:text-red-600 text-xs font-medium"
                        >
                          {l('usermgmt.action.delete')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add new user */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{l('usermgmt.add.heading')}</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (addValid) addMutation.mutate() }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l('usermgmt.add.field.username')}</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l('usermgmt.add.field.password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          {addSuccess && <p className="text-sm text-green-600">{l('usermgmt.add.success')}</p>}
          <div>
            <button type="submit" disabled={!addValid || addMutation.isPending} className="btn-primary">
              {l('usermgmt.add.button')}
            </button>
          </div>
        </form>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <Modal title={l('usermgmt.edit.title')} onClose={() => setEditingUser(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l('usermgmt.edit.field.username')}</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder={editingUser.username}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l('usermgmt.edit.field.password')}</label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="input-field"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            {editSuccess && <p className="text-sm text-green-600">{l('usermgmt.edit.success')}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={(!editUsername.trim() && !editPassword) || updateMutation.isPending}
                className="btn-primary"
              >
                {l('usermgmt.edit.button')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
