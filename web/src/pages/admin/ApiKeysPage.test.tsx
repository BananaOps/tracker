import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import ApiKeysPage from './ApiKeysPage'
import type { AuthContextValue } from '../../contexts/AuthContext'
import type { ApiKey, Team } from '../../types/auth'

const teams: Team[] = [
  { id: 't-plat', name: 'Platform', description: '', permissions: [], scopeAll: true, scopeServices: [], oidcGroups: [], builtin: false },
]
const keys: ApiKey[] = [
  { id: 'k1', prefix: 'trk_aaaa', name: 'gitlab-ci', teamId: 't-plat', createdBy: 'admin', createdAt: '2026-09-01T10:00:00Z', lastUsedAt: '2026-09-04T08:00:00Z' },
  { id: 'k2', prefix: 'trk_bbbb', name: 'old-sync', teamId: '', createdBy: 'admin', createdAt: '2026-01-01T10:00:00Z', revokedAt: '2026-06-01T10:00:00Z' },
  { id: 'k3', prefix: 'trk_cccc', name: 'expired', teamId: 't-plat', createdBy: 'admin', createdAt: '2026-01-01T10:00:00Z', expiresAt: '2026-02-01T10:00:00Z' },
]

const adminPrincipal = { authenticated: true, kind: 'user' as const, userId: 'u-admin', username: 'admin', displayName: 'admin', source: 'local', teams: [], permissions: ['access:manage'], scopeAll: true, scopeServices: [], mustChangePassword: false, isAdmin: true }

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: (): AuthContextValue => ({
    status: 'ready',
    principal: adminPrincipal,
    config: { localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false },
    hasPermission: () => true,
    inScope: () => true,
    logout: async () => {},
    reload: async () => adminPrincipal,
    showToast: vi.fn(),
  }),
}))

vi.mock('../../lib/authApi', () => ({
  authApi: { listApiKeys: vi.fn(), listTeams: vi.fn(), createApiKey: vi.fn(), revokeApiKey: vi.fn() },
  getApiErrorStatus: () => undefined,
  getApiErrorMessage: (err: unknown, fallback: string) => (err as { message?: string } | null)?.message || fallback,
}))

import { authApi } from '../../lib/authApi'

const mocked = authApi as unknown as Record<'listApiKeys' | 'listTeams' | 'createApiKey' | 'revokeApiKey', ReturnType<typeof vi.fn>>

beforeEach(() => {
  mocked.listApiKeys.mockReset().mockResolvedValue(keys)
  mocked.listTeams.mockReset().mockResolvedValue(teams)
  mocked.createApiKey.mockReset()
  mocked.revokeApiKey.mockReset()
})

describe('ApiKeysPage', () => {
  it('lists keys with team, status and last use', async () => {
    renderWithProviders(<ApiKeysPage />, { route: '/admin/api-keys' })
    const row1 = (await screen.findByText('trk_aaaa')).closest('tr') as HTMLElement
    expect(within(row1).getByText('Platform')).toBeInTheDocument()
    expect(within(row1).getByText('Active')).toBeInTheDocument()
    expect(within(row1).getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
    const row2 = screen.getByText('trk_bbbb').closest('tr') as HTMLElement
    expect(within(row2).getByText('Global')).toBeInTheDocument()
    expect(within(row2).getByText('Revoked')).toBeInTheDocument()
    expect(within(row2).queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
    const row3 = screen.getByText('trk_cccc').closest('tr') as HTMLElement
    expect(within(row3).getByText('Expired')).toBeInTheDocument()
    expect(within(row3).getByText('Never')).toBeInTheDocument()
  })

  it('creates a key and reveals the secret', async () => {
    mocked.createApiKey.mockResolvedValue({ apiKey: { ...keys[0], id: 'k9', prefix: 'trk_zzzz', name: 'new-key' }, secret: 'trk_zzzz.supersecret' })
    renderWithProviders(<ApiKeysPage />, { route: '/admin/api-keys' })
    await screen.findByText('trk_aaaa')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New API key' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'new-key')
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }))
    await waitFor(() => expect(mocked.createApiKey).toHaveBeenCalledWith({ name: 'new-key', teamId: 't-plat' }))
    expect(await screen.findByText('trk_zzzz.supersecret')).toBeInTheDocument()
  })

  it('shows the create form, not the previous secret, when reopened', async () => {
    mocked.createApiKey.mockResolvedValue({ apiKey: { ...keys[0], id: 'k9', prefix: 'trk_zzzz', name: 'new-key' }, secret: 'trk_zzzz.supersecret' })
    renderWithProviders(<ApiKeysPage />, { route: '/admin/api-keys' })
    await screen.findByText('trk_aaaa')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New API key' }))
    await user.type(within(screen.getByRole('dialog')).getByLabelText('Name'), 'new-key')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create key' }))
    expect(await screen.findByText('trk_zzzz.supersecret')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New API key' }))
    const reopened = screen.getByRole('dialog')
    expect(within(reopened).getByLabelText('Name')).toBeInTheDocument()
    expect(within(reopened).queryByText('trk_zzzz.supersecret')).not.toBeInTheDocument()
  })

  it('revokes a key after confirmation', async () => {
    mocked.revokeApiKey.mockResolvedValue(undefined)
    renderWithProviders(<ApiKeysPage />, { route: '/admin/api-keys' })
    const row1 = (await screen.findByText('trk_aaaa')).closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(row1).getByRole('button', { name: 'Revoke' }))
    expect(screen.getByText(/Revoke key trk_aaaa \(gitlab-ci\)\?/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoke key' }))
    await waitFor(() => expect(mocked.revokeApiKey).toHaveBeenCalledWith('k1'))
    expect(await screen.findByRole('status')).toHaveTextContent('API key revoked')
  })
})
