import { describe, expect, it, vi } from 'vitest'
import {
  AUTH_FORBIDDEN_EVENT,
  AUTH_UNAUTHORIZED_EVENT,
  handleAuthError,
  loginPathFor,
  onAuthEvent,
  safeRedirect,
  type AuthEventDetail,
} from './authEvents'

function axiosLikeError(status: number, url: string) {
  return { isAxiosError: true, response: { status }, config: { url, baseURL: '/api/v1alpha1' } }
}

describe('handleAuthError', () => {
  it('emits unauthorized for a 401 on a protected route', () => {
    const handler = vi.fn()
    const off = onAuthEvent(AUTH_UNAUTHORIZED_EVENT, handler)
    handleAuthError(axiosLikeError(401, '/events/list'))
    off()
    expect(handler).toHaveBeenCalledTimes(1)
    const detail = handler.mock.calls[0][0] as AuthEventDetail
    expect(detail).toEqual({ url: '/events/list', status: 401 })
  })

  it('emits forbidden for a 403', () => {
    const handler = vi.fn()
    const off = onAuthEvent(AUTH_FORBIDDEN_EVENT, handler)
    handleAuthError(axiosLikeError(403, '/event'))
    off()
    expect(handler).toHaveBeenCalledWith({ url: '/event', status: 403 })
  })

  it('ignores 401 from the login, password, me and config endpoints', () => {
    const handler = vi.fn()
    const off = onAuthEvent(AUTH_UNAUTHORIZED_EVENT, handler)
    for (const url of ['/auth/login', '/auth/password', '/auth/me', '/auth/config']) {
      handleAuthError(axiosLikeError(401, url))
    }
    off()
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores 403 from the login endpoint (cross-site refusal is shown inline)', () => {
    const handler = vi.fn()
    const off = onAuthEvent(AUTH_FORBIDDEN_EVENT, handler)
    handleAuthError(axiosLikeError(403, '/auth/login'))
    off()
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores non-axios errors and other statuses', () => {
    const handler = vi.fn()
    const off1 = onAuthEvent(AUTH_UNAUTHORIZED_EVENT, handler)
    const off2 = onAuthEvent(AUTH_FORBIDDEN_EVENT, handler)
    handleAuthError(new Error('boom'))
    handleAuthError(axiosLikeError(500, '/events/list'))
    off1()
    off2()
    expect(handler).not.toHaveBeenCalled()
  })

  it('unsubscribes', () => {
    const handler = vi.fn()
    const off = onAuthEvent(AUTH_UNAUTHORIZED_EVENT, handler)
    off()
    handleAuthError(axiosLikeError(401, '/events/list'))
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('safeRedirect', () => {
  it('accepts a relative path with a query string', () => {
    expect(safeRedirect('/catalog/foo?tab=events')).toBe('/catalog/foo?tab=events')
  })

  it('rejects protocol-relative, absolute and login targets', () => {
    expect(safeRedirect('//evil.example')).toBe('/dashboard')
    expect(safeRedirect('https://evil.example/x')).toBe('/dashboard')
    expect(safeRedirect('/login?redirect=/x')).toBe('/dashboard')
    expect(safeRedirect('')).toBe('/dashboard')
    expect(safeRedirect(null)).toBe('/dashboard')
    expect(safeRedirect('/\\evil.example')).toBe('/dashboard')
  })
})

describe('loginPathFor', () => {
  it('encodes the current location into the redirect parameter', () => {
    expect(loginPathFor({ pathname: '/locks', search: '?env=prod' })).toBe('/login?redirect=%2Flocks%3Fenv%3Dprod')
  })

  it('does not chain redirects when already on the login page', () => {
    expect(loginPathFor({ pathname: '/login', search: '?redirect=%2Fx' })).toBe('/login?redirect=%2Fx')
  })
})
