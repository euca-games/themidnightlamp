import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('starts with null user', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('sets user', () => {
    const user = { id: '1', username: 'test', email: 'test@test.com', bio: null, avatar_url: null, created_at: '2024-01-01' }
    useAuthStore.getState().setUser(user)
    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('clears user', () => {
    const user = { id: '1', username: 'test', email: 'test@test.com', bio: null, avatar_url: null, created_at: '2024-01-01' }
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })
})
