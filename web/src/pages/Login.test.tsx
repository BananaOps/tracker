import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import Login from './Login'
import type { AuthContextValue } from '../contexts/AuthContext'
import type { Principal } from '../types/auth'

const anonymous: Principal = {
  authenticated: false,
  kind: 'anonymous',
  userId: '',
  username: '',
  displayName: '',
  source: '',
  teams: [],
  permissions: [],
  scopeAll: true,
  scopeServices: [],
  mustChangePassword: false,
  isAdmin: false,
}

const alice: Principal = { ...anonymous, authenticated: true, kind: 'user', userId: 'u1', username: 'alice', displayName: 'Alice', source: 'local' }

const reload = vi.fn(async () => {})
let oidcEnabled = false

vi.mock('../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: anonymous,
    config: { localLoginEnabled: true, oidcEnabled, oidcButtonLabel: 'Sign in with Okta', anonymousPermissions: [], demoMode: false },
    hasPermission: () => false,
    inScope: () => true,
    logout: async () => {},
    reload,
  }),
}))

vi.mock('../lib/authApi', () => ({
  authApi: { login: vi.fn(), me: vi.fn() },
  getApiErrorStatus: (err: unknown) => (err as { status?: number } | null)?.status,
  getApiErrorMessage: (err: unknown, fallback: string) => (err as { message?: string } | null)?.message || fallback,
}))

import { authApi } from '../lib/authApi'

const mocked = authApi as unknown as { login: ReturnType<typeof vi.fn>; me: ReturnType<typeof vi.fn> }

beforeEach(() => {
  oidcEnabled = false
  reload.mockClear()
  mocked.login.mockReset()
  mocked.me.mockReset()
  mocked.me.mockResolvedValue(alice)
})

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('Login', () => {
  it('signs in and follows the validated redirect', async () => {
    mocked.login.mockResolvedValue(undefined)
    renderWithProviders(<Login />, { route: '/login?redirect=%2Flocks%3Fenv%3Dprod' })
    await fillAndSubmit('alice', 'correct horse')
    expect(mocked.login).toHaveBeenCalledWith('alice', 'correct horse')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/locks?env=prod'))
    expect(reload).toHaveBeenCalled()
  })

  it('ignores an external redirect target', async () => {
    mocked.login.mockResolvedValue(undefined)
    renderWithProviders(<Login />, { route: '/login?redirect=https%3A%2F%2Fevil.example' })
    await fillAndSubmit('alice', 'correct horse')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
  })

  it('shows a generic error on 401 and keeps the form', async () => {
    mocked.login.mockRejectedValue({ status: 401, message: 'invalid credentials' })
    renderWithProviders(<Login />, { route: '/login' })
    await fillAndSubmit('alice', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(reload).not.toHaveBeenCalled()
  })

  it('shows the rate limit message on 429', async () => {
    mocked.login.mockRejectedValue({ status: 429 })
    renderWithProviders(<Login />, { route: '/login' })
    await fillAndSubmit('alice', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
  })

  it('sends a user who must change their password to the password page', async () => {
    mocked.login.mockResolvedValue(undefined)
    mocked.me.mockResolvedValue({ ...alice, mustChangePassword: true })
    renderWithProviders(<Login />, { route: '/login?redirect=%2Fcatalog' })
    await fillAndSubmit('admin', 'temporary')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/account/password?redirect=%2Fcatalog'),
    )
  })

  it('offers the SSO button only when OIDC is enabled', () => {
    oidcEnabled = true
    renderWithProviders(<Login />, { route: '/login?redirect=%2Flocks' })
    const sso = screen.getByRole('link', { name: 'Sign in with Okta' })
    expect(sso).toHaveAttribute('href', '/api/v1alpha1/auth/oidc/login?redirect=%2Flocks')
  })
})
