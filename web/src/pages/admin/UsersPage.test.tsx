import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import UsersPage from './UsersPage'
import type { AuthContextValue } from '../../contexts/AuthContext'
import type { Team, User } from '../../types/auth'

const teams: Team[] = [
  { id: 't-admin', name: 'Administrators', description: '', permissions: ['access:manage'], scopeAll: true, scopeServices: [], oidcGroups: [], builtin: true },
  { id: 't-plat', name: 'Platform', description: '', permissions: ['event:read'], scopeAll: true, scopeServices: [], oidcGroups: [], builtin: false },
]
const users: User[] = [
  { id: 'u-admin', username: 'admin', email: '', displayName: 'admin', source: 'local', teamIds: ['t-admin'], disabled: false, mustChangePassword: false },
  { id: 'u-bob', username: 'bob', email: 'bob@x.io', displayName: 'Bob', source: 'oidc', teamIds: ['t-plat'], disabled: true, mustChangePassword: false },
]

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: { authenticated: true, kind: 'user', userId: 'u-admin', username: 'admin', displayName: 'admin', source: 'local', teams: [{ id: 't-admin', name: 'Administrators' }], permissions: ['access:manage'], scopeAll: true, scopeServices: [], mustChangePassword: false, isAdmin: true },
    config: { localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false },
    hasPermission: () => true,
    inScope: () => true,
    logout: async () => {},
    reload: async () => {},
  }),
}))

vi.mock('../../lib/authApi', () => ({
  authApi: { listUsers: vi.fn(), listTeams: vi.fn(), createUser: vi.fn(), updateUser: vi.fn() },
  getApiErrorStatus: () => undefined,
  getApiErrorMessage: (err: unknown, fallback: string) => (err as { message?: string } | null)?.message || fallback,
}))

import { authApi } from '../../lib/authApi'

const mocked = authApi as unknown as Record<'listUsers' | 'listTeams' | 'createUser' | 'updateUser', ReturnType<typeof vi.fn>>

beforeEach(() => {
  mocked.listUsers.mockReset().mockResolvedValue(users)
  mocked.listTeams.mockReset().mockResolvedValue(teams)
  mocked.createUser.mockReset()
  mocked.updateUser.mockReset()
})

describe('UsersPage', () => {
  it('lists users with their source, teams and status', async () => {
    renderWithProviders(<UsersPage />, { route: '/admin/users' })
    const bobRow = (await screen.findByText('bob')).closest('tr') as HTMLElement
    expect(within(bobRow).getByText('oidc')).toBeInTheDocument()
    expect(within(bobRow).getByText('Platform')).toBeInTheDocument()
    expect(within(bobRow).getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('creates a local user with teams', async () => {
    mocked.createUser.mockResolvedValue({ ...users[0], id: 'u-new', username: 'carol' })
    renderWithProviders(<UsersPage />, { route: '/admin/users' })
    await screen.findByText('bob')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New user' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Username'), 'carol')
    await user.type(within(dialog).getByLabelText('Email'), 'carol@x.io')
    await user.type(within(dialog).getByLabelText('Display name'), 'Carol')
    await user.type(within(dialog).getByLabelText('Temporary password'), 'temporary-pass-123')
    await user.click(within(dialog).getByLabelText('Platform'))
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))
    await waitFor(() =>
      expect(mocked.createUser).toHaveBeenCalledWith({
        username: 'carol',
        email: 'carol@x.io',
        displayName: 'Carol',
        password: 'temporary-pass-123',
        teamIds: ['t-plat'],
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('User created')
  })

  it('edits an identity provider user: only teams and status are editable', async () => {
    mocked.updateUser.mockResolvedValue(users[1])
    renderWithProviders(<UsersPage />, { route: '/admin/users' })
    const bobRow = (await screen.findByText('bob')).closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(bobRow).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Email')).toBeDisabled()
    expect(within(dialog).queryByLabelText('Reset password')).not.toBeInTheDocument()
    await user.click(within(dialog).getByLabelText('Administrators'))
    await user.click(within(dialog).getByLabelText('Account disabled'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(mocked.updateUser).toHaveBeenCalledWith('u-bob', {
        email: 'bob@x.io',
        displayName: 'Bob',
        teamIds: ['t-plat', 't-admin'],
        disabled: false,
      }),
    )
  })

  it('shows the API error inside the dialog', async () => {
    mocked.createUser.mockRejectedValue({ message: 'username already exists' })
    renderWithProviders(<UsersPage />, { route: '/admin/users' })
    await screen.findByText('bob')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New user' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Username'), 'bob')
    await user.type(within(dialog).getByLabelText('Temporary password'), 'temporary-pass-123')
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('username already exists')
  })
})
