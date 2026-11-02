import { describe, expect, it } from 'vitest'
import { Environment, EventType, Priority, Status, type Event } from '@/types/api'
import { parseQuery } from './query'
import { buildSuggestions, isKeyDraft, relaxations } from './query-suggestions'

function ev(title: string, a: Partial<Event['attributes']>): Event {
  return {
    title,
    attributes: { message: '', source: 't', type: EventType.DEPLOYMENT, priority: Priority.P3, service: 'checkout', status: Status.SUCCESS, environment: Environment.PRODUCTION, ...a },
  }
}

const events = [
  ev('Deploy checkout', { status: Status.FAILURE, impact: true, owner: 'payments-team' }),
  ev('Deploy checkout again', { status: Status.FAILURE, owner: 'payments-team' }),
  ev('Deploy orders-db', { service: 'orders-db', environment: Environment.MCO, owner: 'data-team' }),
]

const NOW = new Date(2026, 3, 10, 12).getTime()

describe('isKeyDraft', () => {
  it('tells a key being typed from free text', () => {
    expect(isKeyDraft('status:f')).toBe(true)
    expect(isKeyDraft('-env:')).toBe(true)
    expect(isKeyDraft('foo:bar')).toBe(false)
    expect(isKeyDraft('checkout')).toBe(false)
  })
})

describe('buildSuggestions', () => {
  it('offers recent queries and the keys on an empty field', () => {
    const groups = buildSuggestions('', parseQuery(''), events, [{ q: 'status:failed env:production', at: NOW - 86_400_000 }], NOW)
    expect(groups.map((g) => g.label)).toEqual(['recent', 'filter by'])
    expect(groups[0].items[0]).toMatchObject({ label: 'status:failed env:production', hint: 'yesterday' })
    expect(groups[1].items.map((i) => i.label)).toEqual(['env:', 'status:', 'type:', 'owner:', 'service:', 'priority:', 'impact:true'])
    expect(groups[1].items[6]).toMatchObject({ hint: '1 event touches users', impact: true })
  })

  it('lists the values of a typed key with their count, statuses with a glyph', () => {
    const [group] = buildSuggestions('status:f', parseQuery(''), events)
    expect(group.label).toBe('status')
    expect(group.items).toHaveLength(1)
    expect(group.items[0]).toMatchObject({ label: 'failed', hint: '2 in view', status: 'failed', action: { kind: 'add', key: 'status', value: 'failed', neg: false } })
  })

  it('counts values among the events that match the other filters', () => {
    const [group] = buildSuggestions('owner:', parseQuery('env:mco'), events)
    expect(group.items.map((i) => [i.label, i.hint])).toEqual([['data-team', '1 in view']])
  })

  it('prepares an exclusion with a minus and accepts a value not in view', () => {
    const [group] = buildSuggestions('-service:Billing', parseQuery(''), events)
    expect(group.label).toBe('exclude service')
    expect(group.items[group.items.length - 1]).toMatchObject({ label: 'Billing', hint: '0 in view', action: { kind: 'add', key: 'service', value: 'Billing', neg: true } })
  })

  it('matches values, keys and free text for plain text', () => {
    const groups = buildSuggestions('ord', parseQuery(''), events)
    expect(groups.map((g) => g.label)).toEqual(['filter by value', 'text'])
    expect(groups[0].items[0]).toMatchObject({ label: 'service:orders-db', hint: '1 in view' })
    expect(groups[1].items[0]).toMatchObject({ label: 'Titles, services and teams containing “ord”', hint: '1 in view', mono: false })
    expect(buildSuggestions('ser', parseQuery(''), events).map((g) => g.label)).toContain('keys')
  })
})

describe('relaxations', () => {
  it('proposes which filter to remove, the smallest gain first', () => {
    const q = parseQuery('service:orders-db status:failed')
    expect(relaxations(events, q).map((r) => [r.label, r.count])).toEqual([
      ['service:orders-db', 2],
      ['status:failed', 1],
    ].sort((a, b) => (a[1] as number) - (b[1] as number)))
  })
})
