import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { AuthProvider, useAuth } from './AuthContext'
import { emitForbidden, emitUnauthorized } from '../lib/authEvents'
import type { AuthConfig, Principal } from '../types/auth'

vi.mock('../lib/authApi', () => ({
  authApi: {
    getConfig: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
  getApiErrorStatus: (err: unknown) =>
    err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : undefined,
}))

import { authApi } from '../lib/authApi'

const mocked = authApi as unknown as {
  getConfig: ReturnType<typeof vi.fn>
  me: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
}

const config: AuthConfig = {
  localLoginEnabled: true,
  oidcEnabled: false,
  oidcButtonLabel: 'Sign in with SSO',
  anonymousPermissions: [],
  demoMode: false,
}

const alice: Principal = {
  authenticated: true,
  kind: 'user',
  userId: 'u1',
  username: 'alice',
  displayName: 'Alice',
  source: 'local',
  teams: [{ id: 't1', name: 'Platform' }],
  permissions: ['event:read', 'lock:read'],
  scopeAll: false,
  scopeServices: ['payments'],
  mustChangePassword: false,
  isAdmin: false,
}

const loggedOutByServer: Principal = {
  authenticated: false,
  kind: 'anonymous',
  userId: '',
  username: '',
  displayName: '',
  source: '',
  teams: [],
  permissions: ['event:read'],
  scopeAll: false,
  scopeServices: [],
  mustChangePassword: false,
  isAdmin: false,
}

function Probe() {
  const { status, principal, hasPermission, inScope, logout, showToast } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{principal.username || 'anonymous'}</span>
      <span data-testid="event-read">{String(hasPermission('event:read'))}</span>
      <span data-testid="event-write">{String(hasPermission('event:write'))}</span>
      <span data-testid="access-manage">{String(hasPermission('access:manage'))}</span>
      <span data-testid="scope-payments">{String(inScope('payments'))}</span>
      <span data-testid="scope-billing">{String(inScope('billing'))}</span>
      <button onClick={() => logout().catch(() => showToast('Sign out failed'))}>Sign out</button>
    </div>
  )
}

beforeEach(() => {
  mocked.getConfig.mockResolvedValue(config)
  mocked.me.mockResolvedValue(alice)
  mocked.logout.mockResolvedValue(undefined)
})

describe('AuthProvider', () => {
  it('loads the principal and answers permission and scope questions', async () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('user')).toHaveTextContent('alice')
    expect(screen.getByTestId('event-read')).toHaveTextContent('true')
    expect(screen.getByTestId('event-write')).toHaveTextContent('false')
    expect(screen.getByTestId('scope-payments')).toHaveTextContent('true')
    expect(screen.getByTestId('scope-billing')).toHaveTextContent('false')
  })

  it('treats scopeAll as every service', async () => {
    mocked.me.mockResolvedValue({ ...alice, scopeAll: true, scopeServices: [] })
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('scope-billing')).toHaveTextContent('true')
  })

  it('falls back to the transitional anonymous principal when /auth/me is unreachable', async () => {
    mocked.me.mockRejectedValue(new Error('network down'))
    mocked.getConfig.mockRejectedValue(new Error('network down'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('event-write')).toHaveTextContent('true')
    expect(screen.getByTestId('access-manage')).toHaveTextContent('false')
    expect(warn).toHaveBeenCalled()
  })

  it('grants no permission when /auth/me is refused with 401', async () => {
    mocked.me.mockRejectedValue({ status: 401 })
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('event-read')).toHaveTextContent('false')
    expect(screen.getByTestId('event-write')).toHaveTextContent('false')
    expect(screen.getByTestId('access-manage')).toHaveTextContent('false')
  })

  it('redirects to /login with the current location on an unauthorized event', async () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
      { route: '/locks?env=prod' },
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    act(() => emitUnauthorized('/locks/list'))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login?redirect=%2Flocks%3Fenv%3Dprod'),
    )
  })

  it('does not redirect when already on the login page', async () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
      { route: '/login?redirect=%2Fx' },
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    act(() => emitUnauthorized('/events/list'))
    expect(screen.getByTestId('location')).toHaveTextContent('/login?redirect=%2Fx')
  })

  it('shows an access denied toast on a forbidden event', async () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    act(() => emitForbidden('/event'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied')
  })

  it('signs out, adopts the server anonymous principal and lands on plain /login', async () => {
    mocked.me.mockResolvedValueOnce(alice)
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
      { route: '/locks?env=prod' },
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('user')).toHaveTextContent('alice')
    mocked.me.mockResolvedValueOnce(loggedOutByServer)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    expect(mocked.logout).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
    expect(screen.getByTestId('location')).not.toHaveTextContent('?')
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
  })

  it('keeps the session and shows a toast when sign-out fails', async () => {
    mocked.me.mockResolvedValueOnce(alice)
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
      { route: '/dashboard' },
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    mocked.logout.mockRejectedValueOnce({ status: 500 })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed')
    expect(screen.getByTestId('user')).toHaveTextContent('alice')
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
  })
})
