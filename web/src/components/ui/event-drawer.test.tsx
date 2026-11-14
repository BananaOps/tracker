import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DrawerEvent } from '@/lib/event-drawer'
import { Button } from './button'
import { EventDrawer } from './event-drawer'

const event: DrawerEvent = {
  status: 'failed',
  time: '15:04:12',
  title: 'Deploy monitoring v2.5.5 → mco',
  type: 'deployment',
  priority: 'P3',
  service: 'monitoring',
  environment: 'mco',
  owner: 'infra-team',
  stakeholders: ['sre'],
  impact: true,
  impactNote: '#ops notified · status page updated',
  pullRequest: { label: '#1287', href: 'https://github.com/o/r/pull/1287' },
  ticket: null,
  summary: 'Rolls out the new alert rules.',
  fields: [
    ['source', 'github-actions'],
    ['id', 'e1'],
  ],
  history: [
    { time: '15:04', status: 'open', text: 'Created by ci' },
    { time: '15:10', status: 'failed', text: 'Status in_progress → failure by ci' },
  ],
}

describe('EventDrawer', () => {
  it('is a non-modal dialog named after the event', () => {
    render(<EventDrawer event={event} />)
    const drawer = screen.getByRole('dialog', { name: event.title })
    expect(drawer).toHaveAttribute('aria-modal', 'false')
    expect(within(drawer).getByRole('heading', { level: 2 })).toHaveTextContent(event.title)
    expect(within(drawer).getByText('deployment')).toBeInTheDocument()
    expect(within(drawer).getByText('15:04:12')).toBeInTheDocument()
  })

  it('filters the views from the header chips', async () => {
    const onFilter = vi.fn()
    render(<EventDrawer event={event} onFilter={onFilter} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filter by service monitoring' }))
    await userEvent.click(screen.getByRole('button', { name: 'Filter by environment mco' }))
    await userEvent.click(screen.getByRole('button', { name: 'Owner infra-team, stakeholders: sre' }))
    expect(onFilter.mock.calls).toEqual([
      ['service', 'monitoring'],
      ['env', 'mco'],
      ['owner', 'infra-team'],
    ])
  })

  it('links the pull request and shows an empty slot for the missing ticket', async () => {
    const onLinkTicket = vi.fn()
    render(<EventDrawer event={event} onLinkTicket={onLinkTicket} />)
    const pr = screen.getByRole('link', { name: /PR #1287/ })
    expect(pr).toHaveAttribute('href', 'https://github.com/o/r/pull/1287')
    expect(pr).toHaveAttribute('target', '_blank')
    expect(screen.getByText('no ticket').parentElement).toHaveClass('border-dashed')
    await userEvent.click(screen.getByRole('button', { name: 'Link a ticket' }))
    expect(onLinkTicket).toHaveBeenCalled()
  })

  it('shows the impact band, or a quiet line without impact', () => {
    const { rerender } = render(<EventDrawer event={event} />)
    const band = screen.getByRole('note')
    expect(band).toHaveTextContent('Users impacted')
    expect(band).toHaveClass('bg-impact', 'text-on-impact')
    rerender(<EventDrawer event={{ ...event, impact: false }} />)
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.getByText('No user impact declared')).toBeInTheDocument()
  })

  it('lists details and history with status glyphs', () => {
    render(<EventDrawer event={event} />)
    expect(screen.getByText('github-actions')).toBeInTheDocument()
    const history = screen.getByRole('list')
    expect(within(history).getAllByRole('listitem')).toHaveLength(2)
    expect(within(history).getByRole('img', { name: 'failed' })).toHaveClass('text-failed')
  })

  it('falls back to the meta line without facts and hides links when none are given', () => {
    render(<EventDrawer event={{ status: 'done', time: '09:00', title: 'Legacy', meta: ['operation', 'production'] }} />)
    expect(screen.getByText('operation · production')).toBeInTheDocument()
    expect(screen.queryByText('no ticket')).toBeNull()
  })

  it('closes with the close button and with Esc', async () => {
    const onClose = vi.fn()
    render(<EventDrawer event={event} onClose={onClose} actions={<Button variant="primary">Edit event</Button>} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close detail' }))
    screen.getByRole('button', { name: 'Edit event' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
