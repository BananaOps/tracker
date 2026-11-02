import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_QUERY, parseQuery, serializeQuery, type Query } from '@/lib/query'
import { Environment, EventType, Priority, Status, type Event } from '@/types/api'
import { QueryBar, QueryEmptyState } from './query-bar'

function ev(title: string, a: Partial<Event['attributes']>): Event {
  return {
    title,
    attributes: { message: '', source: 't', type: EventType.DEPLOYMENT, priority: Priority.P3, service: 'checkout', status: Status.SUCCESS, environment: Environment.PRODUCTION, ...a },
  }
}

const events = [
  ev('Deploy checkout', { status: Status.FAILURE, impact: true, owner: 'payments-team' }),
  ev('Deploy orders-db', { service: 'orders-db', environment: Environment.MCO, owner: 'data-team' }),
]

function Harness({ initial = '', onQuery }: { initial?: string; onQuery?: (q: string) => void }) {
  const [query, setQuery] = useState<Query>(parseQuery(initial))
  return (
    <>
      <QueryBar
        query={query}
        events={events}
        onChange={(q) => {
          setQuery(q)
          onQuery?.(serializeQuery(q))
        }}
      />
      <output data-testid="q">{serializeQuery(query)}</output>
    </>
  )
}

const field = () => screen.getByRole('combobox', { name: 'Filter events' })
const q = () => screen.getByTestId('q').textContent

beforeEach(() => {
  window.localStorage.clear()
})

describe('QueryBar', () => {
  it('opens the keys on focus and is reachable as the page filter', async () => {
    render(<Harness />)
    expect(field()).toHaveAttribute('data-page-filter')
    await userEvent.click(field())
    const list = screen.getByRole('listbox', { name: 'Suggestions' })
    expect(within(list).getByRole('group', { name: 'filter by' })).toBeInTheDocument()
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    expect(within(list).getByText('impact:true')).toBeInTheDocument()
  })

  it('adds a value from its key with ↵, then removes it with ⌫ on the empty field', async () => {
    render(<Harness />)
    await userEvent.type(field(), 'status:f')
    const option = screen.getByRole('option', { name: /failed/ })
    expect(option).toHaveAttribute('aria-selected', 'true')
    expect(option).toHaveTextContent('1 in view')
    await userEvent.keyboard('{Enter}')
    expect(q()).toBe('status:failed')
    expect(field()).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Remove filter status failed' })).toBeInTheDocument()
    await userEvent.keyboard('{Backspace}')
    expect(q()).toBe('')
  })

  it('picks a key, then a value, with the mouse', async () => {
    render(<Harness />)
    await userEvent.click(field())
    await userEvent.click(screen.getByRole('option', { name: /^env:/ }))
    expect(field()).toHaveValue('env:')
    await userEvent.click(screen.getByRole('option', { name: /mco/ }))
    expect(q()).toBe('env:mco')
  })

  it('excludes with a minus and shows ≠ in the token', async () => {
    render(<Harness />)
    await userEvent.type(field(), '-env:prod{Enter}')
    expect(q()).toBe('-env:production')
    expect(screen.getByText('≠ production')).toBeInTheDocument()
  })

  it('filters on free text as you type, keeps spaces, and moves with the arrows', async () => {
    render(<Harness />)
    await userEvent.type(field(), 'deploy ord')
    expect(field()).toHaveValue('deploy ord')
    expect(q()).toBe('deploy ord')
    await userEvent.clear(field())
    await userEvent.type(field(), 'ord')
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('remembers committed queries as recent ones', async () => {
    const { unmount } = render(<Harness />)
    await userEvent.type(field(), 'status:fail{Enter}')
    unmount()
    render(<Harness />)
    await userEvent.click(field())
    const recent = screen.getByRole('group', { name: 'recent' })
    expect(within(recent).getByText('status:failed')).toBeInTheDocument()
  })

  it('closes with esc and clears everything with Clear', async () => {
    const onQuery = vi.fn()
    render(<Harness initial="env:mco checkout" onQuery={onQuery} />)
    expect(field()).toHaveValue('checkout')
    await userEvent.click(field())
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onQuery).toHaveBeenLastCalledWith('')
    expect(field()).toHaveValue('')
  })
})

describe('QueryEmptyState', () => {
  it('offers to remove the filter that empties the result', async () => {
    const onChange = vi.fn()
    render(<QueryEmptyState query={parseQuery('service:orders-db status:failed')} events={events} onChange={onChange} />)
    expect(screen.getByText('service:orders-db status:failed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'status:failed · 1 result' }))
    expect(serializeQuery(onChange.mock.lastCall![0])).toBe('service:orders-db')
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_QUERY)
  })
})
