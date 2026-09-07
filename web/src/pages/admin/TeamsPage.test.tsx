import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import TeamsPage from './TeamsPage'
import { QUERY_KEYS } from '../../components/admin/adminUi'
import type { Team, User } from '../../types/auth'

const teams: Team[] = [
  { id: 't-admin', name: 'Administrators', description: 'Built-in', permissions: ['access:manage'], scopeAll: true, scopeServices: [], oidcGroups: [], builtin: true },
  // 'legacy:custom' is not in the frontend's Permission union: it stands in
  // for a permission the backend knows about that this build does not yet.
  { id: 't-plat', name: 'Platform', description: 'Platform team', permissions: ['event:read', 'event:write', 'legacy:custom'], scopeAll: true, scopeServices: [], oidcGroups: ['platform-eng'], builtin: false },
]
const users: User[] = [
  { id: 'u-admin', username: 'admin', email: '', displayName: 'admin', source: 'local', teamIds: ['t-admin'], disabled: false, mustChangePassword: false },
  { id: 'u-bob', username: 'bob', email: '', displayName: 'Bob', source: 'oidc', teamIds: ['t-plat'], disabled: false, mustChangePassword: false },
]

vi.mock('../../lib/authApi', () => ({
  authApi: { listTeams: vi.fn(), listUsers: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn(), deleteTeam: vi.fn() },
  getApiErrorStatus: () => undefined,
  getApiErrorMessage: (err: unknown, fallback: string) => (err as { message?: string } | null)?.message || fallback,
}))

import { authApi } from '../../lib/authApi'

const mocked = authApi as unknown as Record<'listTeams' | 'listUsers' | 'createTeam' | 'updateTeam' | 'deleteTeam', ReturnType<typeof vi.fn>>

beforeEach(() => {
  mocked.listTeams.mockReset().mockResolvedValue(teams)
  mocked.listUsers.mockReset().mockResolvedValue(users)
  mocked.createTeam.mockReset()
  mocked.updateTeam.mockReset()
  mocked.deleteTeam.mockReset()
})

describe('TeamsPage', () => {
  it('lists teams with members count and hides delete for builtin teams', async () => {
    renderWithProviders(<TeamsPage />, { route: '/admin/teams' })
    const adminRow = (await screen.findByText('Administrators')).closest('tr') as HTMLElement
    expect(within(adminRow).getByText('builtin')).toBeInTheDocument()
    expect(within(adminRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    const platRow = screen.getByText('Platform').closest('tr') as HTMLElement
    expect(within(platRow).getByText('platform-eng')).toBeInTheDocument()
    expect(within(platRow).getByText('1')).toBeInTheDocument()
    expect(within(platRow).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('creates a team with permissions and OIDC groups', async () => {
    mocked.createTeam.mockResolvedValue(teams[1])
    renderWithProviders(<TeamsPage />, { route: '/admin/teams' })
    await screen.findByText('Platform')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New team' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Payments')
    await user.type(within(dialog).getByLabelText('Description'), 'Payments squad')
    await user.click(within(dialog).getByLabelText('event:read'))
    await user.click(within(dialog).getByLabelText('lock:write'))
    await user.type(within(dialog).getByLabelText('OIDC groups'), 'payments-team{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Create team' }))
    await waitFor(() =>
      expect(mocked.createTeam).toHaveBeenCalledWith({
        name: 'Payments',
        description: 'Payments squad',
        permissions: ['event:read', 'lock:write'],
        scopeAll: true,
        scopeServices: [],
        oidcGroups: ['payments-team'],
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Team created')
  })

  it('locks name and permissions for a builtin team but allows OIDC groups', async () => {
    mocked.updateTeam.mockResolvedValue(teams[0])
    renderWithProviders(<TeamsPage />, { route: '/admin/teams' })
    const adminRow = (await screen.findByText('Administrators')).closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(adminRow).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Name')).toBeDisabled()
    expect(within(dialog).getByLabelText('access:manage')).toBeDisabled()
    expect(within(dialog).getByText('admin')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('OIDC groups'), 'tracker-admins{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(mocked.updateTeam).toHaveBeenCalledWith('t-admin', {
        name: 'Administrators',
        description: 'Built-in',
        permissions: ['access:manage'],
        scopeAll: true,
        scopeServices: [],
        oidcGroups: ['tracker-admins'],
      }),
    )
  })

  it('deletes a team after confirmation and refreshes users and API keys too', async () => {
    mocked.deleteTeam.mockResolvedValue(undefined)
    const { queryClient } = renderWithProviders(<TeamsPage />, { route: '/admin/teams' })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const platRow = (await screen.findByText('Platform')).closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(platRow).getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/Delete team Platform\?/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete team' }))
    await waitFor(() => expect(mocked.deleteTeam).toHaveBeenCalledWith('t-plat'))
    expect(await screen.findByRole('status')).toHaveTextContent('Team deleted')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.users })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.apiKeys })
  })

  it('preserves a permission unknown to this build when toggling another one', async () => {
    mocked.updateTeam.mockResolvedValue(teams[1])
    const { queryClient } = renderWithProviders(<TeamsPage />, { route: '/admin/teams' })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const platRow = (await screen.findByText('Platform')).closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(platRow).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText('catalog:read'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(mocked.updateTeam).toHaveBeenCalledWith('t-plat', {
        name: 'Platform',
        description: 'Platform team',
        permissions: ['event:read', 'event:write', 'catalog:read', 'legacy:custom'],
        scopeAll: true,
        scopeServices: [],
        oidcGroups: ['platform-eng'],
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Team updated')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.users })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.apiKeys })
  })
})
