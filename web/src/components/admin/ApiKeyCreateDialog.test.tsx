import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeyCreateDialog } from './ApiKeyCreateDialog'
import type { Team } from '../../types/auth'

const teams: Team[] = [
  { id: 't-plat', name: 'Platform', description: '', permissions: [], scopeAll: true, scopeServices: [], oidcGroups: [], builtin: false },
]

describe('ApiKeyCreateDialog', () => {
  it('submits name, team and no expiration', async () => {
    const onSubmit = vi.fn()
    render(<ApiKeyCreateDialog open teams={teams} canCreateGlobal={false} pending={false} error={null} result={null} onSubmit={onSubmit} onClose={() => {}} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'gitlab-ci')
    expect(screen.queryByRole('option', { name: /Global/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create key' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'gitlab-ci', teamId: 't-plat' })
  })

  it('offers the global option to admins and converts the expiration', async () => {
    const onSubmit = vi.fn()
    render(<ApiKeyCreateDialog open teams={teams} canCreateGlobal pending={false} error={null} result={null} onSubmit={onSubmit} onClose={() => {}} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'global-sync')
    await user.selectOptions(screen.getByLabelText('Team'), '')
    fireEvent.change(screen.getByLabelText('Expires at (optional)'), { target: { value: '2027-01-31T10:30' } })
    await user.click(screen.getByRole('button', { name: 'Create key' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const input = onSubmit.mock.calls[0][0] as { name: string; teamId: string; expiresAt?: string }
    expect(input.teamId).toBe('')
    expect(input.expiresAt).toBe(new Date('2027-01-31T10:30').toISOString())
  })

  it('shows the secret once with a copy button', async () => {
    const onClose = vi.fn()
    render(
      <ApiKeyCreateDialog
        open
        teams={teams}
        canCreateGlobal={false}
        pending={false}
        error={null}
        result={{ apiKey: { id: 'k1', prefix: 'trk_abcd', name: 'gitlab-ci', teamId: 't-plat', createdBy: 'admin' }, secret: 'trk_abcd.verysecretvalue' }}
        onSubmit={() => {}}
        onClose={onClose}
      />,
    )
    expect(screen.getByText('trk_abcd.verysecretvalue')).toBeInTheDocument()
    expect(screen.getByText(/shown once/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('trk_abcd.verysecretvalue')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })
})
