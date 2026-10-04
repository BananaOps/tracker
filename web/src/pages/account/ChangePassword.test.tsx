import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import ChangePassword from './ChangePassword'
import type { AuthContextValue } from '../../contexts/AuthContext'
import type { Principal } from '../../types/auth'

let current: Principal = {
  authenticated: true,
  kind: 'user',
  userId: 'u1',
  username: 'admin',
  displayName: 'admin',
  source: 'local',
  teams: [],
  permissions: ['access:manage'],
  scopeAll: true,
  scopeServices: [],
  mustChangePassword: true,
  isAdmin: true,
}
const reload = vi.fn(async () => current)

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: current,
    config: { localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false },
    hasPermission: () => true,
    inScope: () => true,
    logout: async () => {},
    reload,
    showToast: vi.fn(),
  }),
}))

vi.mock('../../lib/authApi', () => ({
  authApi: { changePassword: vi.fn() },
  getApiErrorStatus: (err: unknown) => (err as { status?: number } | null)?.status,
  getApiErrorMessage: (err: unknown, fallback: string) => (err as { message?: string } | null)?.message || fallback,
}))

import { authApi } from '../../lib/authApi'

const mocked = authApi as unknown as { changePassword: ReturnType<typeof vi.fn> }

beforeEach(() => {
  reload.mockClear()
  mocked.changePassword.mockReset()
})

async function submit(currentPw: string, next: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Current password'), currentPw)
  await user.type(screen.getByLabelText('New password'), next)
  await user.type(screen.getByLabelText('Confirm new password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePassword', () => {
  it('changes the password and follows the redirect', async () => {
    mocked.changePassword.mockResolvedValue(undefined)
    renderWithProviders(<ChangePassword />, { route: '/account/password?redirect=%2Fcatalog' })
    expect(screen.getByText(/must choose a new password/i)).toBeInTheDocument()
    await submit('temporary-pass', 'a-much-longer-secret', 'a-much-longer-secret')
    expect(mocked.changePassword).toHaveBeenCalledWith('temporary-pass', 'a-much-longer-secret')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/catalog'))
    expect(reload).toHaveBeenCalled()
  })

  it('rejects a mismatching confirmation without calling the API', async () => {
    renderWithProviders(<ChangePassword />, { route: '/account/password' })
    await submit('temporary-pass', 'a-much-longer-secret', 'a-much-longer-secreT')
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match')
    expect(mocked.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a short password without calling the API', async () => {
    renderWithProviders(<ChangePassword />, { route: '/account/password' })
    await submit('temporary-pass', 'short', 'short')
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 12 characters')
    expect(mocked.changePassword).not.toHaveBeenCalled()
  })

  it('shows the backend answer for a wrong current password', async () => {
    mocked.changePassword.mockRejectedValue({ status: 401, message: 'current password is incorrect' })
    renderWithProviders(<ChangePassword />, { route: '/account/password' })
    await submit('nope-not-it-really', 'a-much-longer-secret', 'a-much-longer-secret')
    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect')
  })

  it('hides the form for identity provider accounts', () => {
    current = { ...current, source: 'oidc', mustChangePassword: false }
    renderWithProviders(<ChangePassword />, { route: '/account/password' })
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
    expect(screen.getByText(/managed by your identity provider/i)).toBeInTheDocument()
  })
})
