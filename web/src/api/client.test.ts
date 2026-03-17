import { describe, it, expect } from 'vitest'
import api from './client'

describe('api client', () => {
  it('has correct base URL', () => {
    expect(api.defaults.baseURL).toBe('/api/v1')
  })

  it('sends credentials', () => {
    expect(api.defaults.withCredentials).toBe(true)
  })

  it('has response interceptor', () => {
    // Axios stores interceptors, we check at least one exists
    const interceptors = api.interceptors.response as unknown as { handlers: unknown[] }
    expect(interceptors.handlers.length).toBeGreaterThan(0)
  })
})
