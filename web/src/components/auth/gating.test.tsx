import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Can } from './Can'
import { RequirePermission } from './RequirePermission'
import type { AuthContextValue } from '../../contexts/AuthContext'
import type { Principal } from '../../types/auth'

const base: Principal = {
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

let current: Principal = base

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: current,
    config: { localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false },
    hasPermission: (p: string) => current.permissions.includes(p),
    inScope: () => true,
    logout: async () => {},
    reload: async () => current,
    showToast: vi.fn(),
  }),
}))

describe('Can', () => {
  it('renders children when the permission is granted', () => {
    current = base
    renderWithProviders(
      <Can perm="event:read">
        <button>New Event</button>
      </Can>,
    )
    expect(screen.getByRole('button', { name: 'New Event' })).toBeInTheDocument()
  })

  it('renders the fallback otherwise', () => {
    current = base
    renderWithProviders(
      <Can perm="event:write" fallback={<span>read only</span>}>
        <button>New Event</button>
      </Can>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('read only')).toBeInTheDocument()
  })
})

describe('RequirePermission', () => {
  it('renders the page when the permission is granted', () => {
    current = base
    renderWithProviders(
      <RequirePermission perm="event:read">
        <h1>Timeline</h1>
      </RequirePermission>,
      { route: '/events/timeline' },
    )
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('sends an anonymous visitor to the login page with a redirect', () => {
    current = base
    renderWithProviders(
      <RequirePermission perm="lock:read">
        <h1>Locks</h1>
      </RequirePermission>,
      { route: '/locks?env=prod' },
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?redirect=%2Flocks%3Fenv%3Dprod')
  })

  it('shows access denied to an authenticated user without the permission', () => {
    current = { ...base, authenticated: true, kind: 'user', username: 'bob' }
    renderWithProviders(
      <RequirePermission perm="access:manage">
        <h1>Users</h1>
      </RequirePermission>,
      { route: '/admin/users' },
    )
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users')
  })

  it('requires a signed-in user when user is set', () => {
    current = base
    renderWithProviders(
      <RequirePermission user>
        <h1>Change password</h1>
      </RequirePermission>,
      { route: '/account/password' },
    )
    expect(screen.getByTestId('location')).toHaveTextContent('/login?redirect=%2Faccount%2Fpassword')
  })
})
