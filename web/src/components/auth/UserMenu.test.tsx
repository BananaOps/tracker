import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { UserMenu } from './UserMenu'
import type { AuthContextValue } from '../../contexts/AuthContext'
import type { Principal } from '../../types/auth'

const anonymous: Principal = {
  authenticated: false,
  kind: 'anonymous',
  userId: '',
  username: '',
  displayName: '',
  source: '',
  teams: [],
  permissions: ['event:read'],
  scopeAll: true,
  scopeServices: [],
  mustChangePassword: false,
  isAdmin: false,
}
let current: Principal = anonymous
const logout = vi.fn(async () => {})

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: current,
    config: { localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false },
    hasPermission: (p: string) => current.permissions.includes(p),
    inScope: () => true,
    logout,
    reload: async () => {},
  }),
}))

describe('UserMenu', () => {
  it('offers a sign-in link that comes back to the current page', () => {
    current = anonymous
    renderWithProviders(<UserMenu />, { route: '/locks?env=prod' })
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?redirect=%2Flocks%3Fenv%3Dprod')
  })

  it('shows the account, source and actions for a local user', async () => {
    current = { ...anonymous, authenticated: true, kind: 'user', username: 'alice', displayName: 'Alice Doe', source: 'local', teams: [{ id: 't1', name: 'Platform' }] }
    renderWithProviders(<UserMenu />, { route: '/dashboard' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Alice Doe/ }))
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('local')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Change password' })).toHaveAttribute('href', '/account/password')
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalled()
  })

  it('hides the password entry for identity provider accounts', async () => {
    current = { ...anonymous, authenticated: true, kind: 'user', username: 'bob', displayName: 'Bob', source: 'oidc' }
    renderWithProviders(<UserMenu />, { route: '/dashboard' })
    await userEvent.setup().click(screen.getByRole('button', { name: /Bob/ }))
    expect(screen.queryByRole('menuitem', { name: 'Change password' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  })
})
