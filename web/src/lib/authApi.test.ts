import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import axiosInstance from './api'
import { authApi, getApiErrorMessage, getApiErrorStatus } from './authApi'

function axiosErrorWith(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('request failed', String(status), config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authApi', () => {
  it('posts credentials to /auth/login', async () => {
    const post = vi.spyOn(axiosInstance, 'post').mockResolvedValue({ status: 204, data: '' })
    await authApi.login('alice', 's3cret-password')
    expect(post).toHaveBeenCalledWith('/auth/login', { username: 'alice', password: 's3cret-password' })
  })

  it('normalises the Me response into a Principal', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      status: 200,
      data: {
        authenticated: true,
        kind: 'user',
        userId: '66f0',
        username: 'alice',
        displayName: '',
        source: 'local',
        teams: [{ id: 't1', name: 'Platform' }],
        permissions: ['event:read'],
        scopeAll: true,
        mustChangePassword: false,
        isAdmin: false,
      },
    })
    const me = await authApi.me()
    expect(me.permissions).toEqual(['event:read'])
    expect(me.scopeServices).toEqual([])
    expect(me.teams[0].name).toBe('Platform')
    expect(me.displayName).toBe('alice')
  })

  it('unwraps list responses', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      status: 200,
      data: { apiKeys: [{ id: 'k1', prefix: 'trk_abcd', name: 'ci', teamId: '', createdBy: 'admin' }] },
    })
    const keys = await authApi.listApiKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].prefix).toBe('trk_abcd')
  })

  it('sends PUT /auth/users/{id} with the full replacement body', async () => {
    const put = vi.spyOn(axiosInstance, 'put').mockResolvedValue({ status: 200, data: { user: { id: 'u1' } } })
    await authApi.updateUser('u1', { email: 'a@x.io', displayName: 'Alice', teamIds: ['t1'], disabled: false })
    expect(put).toHaveBeenCalledWith('/auth/users/u1', {
      email: 'a@x.io',
      displayName: 'Alice',
      teamIds: ['t1'],
      disabled: false,
    })
  })
})

describe('getApiErrorMessage', () => {
  it('reads the cookie endpoint {error} shape', () => {
    expect(getApiErrorMessage(axiosErrorWith(401, { error: 'invalid credentials' }), 'fallback')).toBe('invalid credentials')
  })

  it('reads the gateway {message} shape', () => {
    expect(getApiErrorMessage(axiosErrorWith(400, { code: 3, message: 'name is required' }), 'fallback')).toBe('name is required')
  })

  it('falls back for unknown errors', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
    expect(getApiErrorStatus(new Error('boom'))).toBeUndefined()
    expect(getApiErrorStatus(axiosErrorWith(429, {}))).toBe(429)
  })
})
