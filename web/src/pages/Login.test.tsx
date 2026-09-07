import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LocationProbe, renderWithProviders } from '../test/renderWithProviders'
import Login from './Login'
import { RequirePermission } from '../components/auth/RequirePermission'
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

// Mutable like `oidcEnabled` below: the mock factory reads through this
// binding on every render, so tests can flip it mid-scenario.
let currentPrincipal: Principal = anonymous
const reload = vi.fn(async () => alice)
let oidcEnabled = false

vi.mock('../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: currentPrincipal,
    config: { localLoginEnabled: true, oidcEnabled, oidcButtonLabel: 'Sign in with Okta', anonymousPermissions: [], demoMode: false },
    hasPermission: () => false,
    inScope: () => true,
    logout: async () => {},
    reload,
    showToast: vi.fn(),
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
  currentPrincipal = anonymous
  reload.mockReset()
  reload.mockResolvedValue(alice)
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

/**
 * Mounts `/login` next to the handful of distinct routes it can redirect to,
 * matching how App.tsx separates them. `renderWithProviders`'s single
 * catch-all route would keep Login mounted after a redirect and let it
 * re-derive `target` from the now-query-less URL, which is not how the real
 * router behaves once Login has actually navigated away.
 */
function renderLoginRoutes(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/catalog" element={<div>Catalog page</div>} />
        <Route path="/locks" element={<div>Locks page</div>} />
        <Route
          path="/account/password"
          element={
            <RequirePermission user>
              <div>Change password</div>
            </RequirePermission>
          }
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
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
    reload.mockResolvedValueOnce({ ...alice, mustChangePassword: true })
    renderWithProviders(<Login />, { route: '/login?redirect=%2Fcatalog' })
    await fillAndSubmit('admin', 'temporary')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/account/password?redirect=%2Fcatalog'),
    )
  })

  it('sends an already signed-in visitor to the redirect target', () => {
    currentPrincipal = alice
    renderLoginRoutes('/login?redirect=%2Fcatalog')
    expect(screen.getByTestId('location')).toHaveTextContent('/catalog')
    expect(screen.getByText('Catalog page')).toBeInTheDocument()
  })

  it('sends an already signed-in visitor who must change their password to the password page', () => {
    currentPrincipal = { ...alice, mustChangePassword: true }
    renderLoginRoutes('/login?redirect=%2Flocks')
    expect(screen.getByTestId('location')).toHaveTextContent('/account/password?redirect=%2Flocks')
    expect(screen.getByText('Change password')).toBeInTheDocument()
  })

  it('refreshes the context before the forced password change redirect', async () => {
    mocked.login.mockResolvedValue(undefined)
    // Mimics AuthContext.reload(): the principal only flips to the
    // must-change-password state once reload resolves, after a real tick
    // (a network round trip in production). If Login navigated before
    // awaiting reload, RequirePermission below renders with the still
    // anonymous principal first and bounces back to /login instead.
    reload.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      currentPrincipal = { ...alice, mustChangePassword: true }
      return currentPrincipal
    })
    renderLoginRoutes('/login?redirect=%2Fcatalog')
    await fillAndSubmit('admin', 'temporary')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/account/password?redirect=%2Fcatalog'),
    )
    expect(screen.getByText('Change password')).toBeInTheDocument()
  })

  it('offers the SSO button only when OIDC is enabled', () => {
    oidcEnabled = true
    renderWithProviders(<Login />, { route: '/login?redirect=%2Flocks' })
    const sso = screen.getByRole('link', { name: 'Sign in with Okta' })
    expect(sso).toHaveAttribute('href', '/api/v1alpha1/auth/oidc/login?redirect=%2Flocks')
  })
})
