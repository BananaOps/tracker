import { describe, expect, it } from 'vitest'
import { Environment, EventType, Priority, Status, type Event } from '@/types/api'
import {
  addValues,
  countValues,
  EMPTY_QUERY,
  isEmptyQuery,
  matchEvent,
  parseQuery,
  removeToken,
  serializeQuery,
  toSearchParams,
} from './query'

function ev(title: string, a: Partial<Event['attributes']>): Event {
  return {
    title,
    attributes: {
      message: '',
      source: 'test',
      type: EventType.DEPLOYMENT,
      priority: Priority.P3,
      service: 'checkout',
      status: Status.SUCCESS,
      environment: Environment.PRODUCTION,
      ...a,
    },
  }
}

const events = [
  ev('Deploy checkout v4.0.0', { status: Status.FAILURE, impact: true, owner: 'payments-team' }),
  ev('Deploy orders-db', { service: 'orders-db', environment: Environment.MCO, owner: 'data-team' }),
  ev('Schema migration on orders-db', { service: 'orders-db', type: EventType.OPERATION, status: Status.IN_PROGRESS, owner: 'data-team' }),
  ev('Terraform drift on Checkout', { service: 'Checkout', type: EventType.DRIFT, status: Status.WARNING, environment: Environment.PREPRODUCTION }),
]

describe('parseQuery', () => {
  it('reads keys, several values, exclusions, phrases and free text', () => {
    expect(parseQuery('env:production,mco -status:done "schema migration" checkout')).toEqual({
      tokens: [
        { key: 'env', values: ['production', 'mco'], neg: false },
        { key: 'status', values: ['done'], neg: true },
      ],
      text: ['schema migration', 'checkout'],
    })
  })

  it('merges repeated keys of the same sign', () => {
    expect(parseQuery('env:production env:mco').tokens).toEqual([{ key: 'env', values: ['production', 'mco'], neg: false }])
  })

  it('reads unknown keys and empty values as text, and ignores case on keys', () => {
    expect(parseQuery('foo:bar env: ENV:mco')).toEqual({
      tokens: [{ key: 'env', values: ['mco'], neg: false }],
      text: ['foo:bar', 'env:'],
    })
  })

  it('accepts quoted values', () => {
    expect(parseQuery('service:"orders db"').tokens[0].values).toEqual(['orders db'])
  })

  it('returns an empty query for blank input', () => {
    expect(parseQuery('  ')).toEqual(EMPTY_QUERY)
    expect(isEmptyQuery(parseQuery(''))).toBe(true)
  })
})

describe('serializeQuery', () => {
  it.each([
    'env:production,mco -status:done "schema migration" checkout',
    'impact:true owner:payments-team',
    'service:"orders db"',
    '',
  ])('round-trips %s', (input) => {
    const query = parseQuery(input)
    expect(serializeQuery(query)).toBe(input)
    expect(parseQuery(serializeQuery(query))).toEqual(query)
  })
})

describe('addValues and removeToken', () => {
  it('adds to the token of the same key and sign without duplicates', () => {
    let q = addValues(EMPTY_QUERY, 'env', ['production'])
    q = addValues(q, 'env', ['MCO', 'production'])
    q = addValues(q, 'env', ['production'], true)
    expect(q.tokens).toEqual([
      { key: 'env', values: ['production', 'MCO'], neg: false },
      { key: 'env', values: ['production'], neg: true },
    ])
    expect(removeToken(q, 0).tokens).toEqual([{ key: 'env', values: ['production'], neg: true }])
  })
})

describe('matchEvent', () => {
  const titles = (q: string) => events.filter((e) => matchEvent(e, parseQuery(q))).map((e) => e.title)

  it('requires one of the values of each key', () => {
    expect(titles('env:mco,preproduction')).toEqual(['Deploy orders-db', 'Terraform drift on Checkout'])
  })

  it('excludes with a minus', () => {
    expect(titles('service:orders-db -status:running')).toEqual(['Deploy orders-db'])
  })

  it('reads status as a design system status and impact as true / false', () => {
    expect(titles('status:failed')).toEqual(['Deploy checkout v4.0.0'])
    expect(titles('impact:true')).toEqual(['Deploy checkout v4.0.0'])
  })

  it('ignores case on values and searches text in titles, services and teams', () => {
    expect(titles('service:CHECKOUT')).toEqual(['Deploy checkout v4.0.0', 'Terraform drift on Checkout'])
    expect(titles('"schema migration"')).toEqual(['Schema migration on orders-db'])
    expect(titles('data-team')).toEqual(['Deploy orders-db', 'Schema migration on orders-db'])
  })
})

describe('countValues', () => {
  it('counts the values of a key among the events matching the rest of the query', () => {
    expect(countValues(events, parseQuery('service:orders-db status:failed'), 'status')).toEqual([
      { value: 'done', count: 1 },
      { value: 'running', count: 1 },
    ])
  })
})

describe('toSearchParams', () => {
  it('sends single positive values of server-side keys', () => {
    expect(toSearchParams(parseQuery('env:production type:Deployment priority:P1 service:Checkout impact:true'))).toEqual({
      environment: 'production',
      type: 'deployment',
      priority: 'p1',
      service: 'Checkout',
      impact: true,
    })
  })

  it('keeps several values, exclusions, owner, status and text on the client', () => {
    expect(toSearchParams(parseQuery('env:production,mco -type:drift owner:data-team status:failed checkout'))).toEqual({})
    expect(toSearchParams(parseQuery('env:nowhere impact:false'))).toEqual({})
  })
})
