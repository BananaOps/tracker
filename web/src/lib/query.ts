// The filter query shared by the time views (Timeline, Streamline, Calendar):
//
//   env:production          one value
//   env:production,mco      any of these values
//   -status:done            exclude a value
//   impact:true             events that touch users
//   "schema migration"      exact phrase
//   checkout                free text
//
// The query lives in the URL (?q=…). Keys and values match case-insensitively; values keep
// the case they were typed or picked with, so that a service name reaches the API intact.

import { Environment, EventType, Priority, type Event } from '@/types/api'
import { toDsStatus } from './status'

export const QUERY_KEYS = ['env', 'status', 'type', 'owner', 'service', 'priority', 'impact'] as const
export type QueryKey = (typeof QUERY_KEYS)[number]

export const KEY_HINTS: Record<QueryKey, string> = {
  env: 'production, preproduction…',
  status: 'failed, running, open…',
  type: 'deployment, operation, drift…',
  owner: 'payments-team…',
  service: 'checkout, orders-db…',
  priority: 'p1 – p5',
  impact: 'true — events that touch users',
}

export interface QueryToken {
  key: QueryKey
  values: string[]
  /** Excludes the values instead of requiring one of them. */
  neg: boolean
}

export interface Query {
  tokens: QueryToken[]
  /** Free words and "exact phrases", all required. */
  text: string[]
}

export const EMPTY_QUERY: Query = { tokens: [], text: [] }

const isKey = (k: string): k is QueryKey => (QUERY_KEYS as readonly string[]).includes(k)

/** Adds values to the token of the same key and sign, or creates it. */
export function addValues(query: Query, key: QueryKey, values: string[], neg = false): Query {
  const clean = values.map((v) => v.trim()).filter(Boolean)
  if (!clean.length) return query
  const tokens = query.tokens.map((t) => ({ ...t, values: [...t.values] }))
  let found = tokens.find((t) => t.key === key && t.neg === neg)
  if (!found) {
    found = { key, values: [], neg }
    tokens.push(found)
  }
  for (const v of clean) {
    if (!found.values.some((x) => x.toLowerCase() === v.toLowerCase())) found.values.push(v)
  }
  return { ...query, tokens }
}

export function removeToken(query: Query, index: number): Query {
  return { ...query, tokens: query.tokens.filter((_, i) => i !== index) }
}

export function isEmptyQuery(query: Query): boolean {
  return query.tokens.length === 0 && query.text.length === 0
}

const TERM = /(-?)([a-zA-Z]+):("[^"]*"|\S*)|"([^"]*)"|(\S+)/g

/** Parses the query syntax. Unknown keys and empty values read as free text. */
export function parseQuery(input: string): Query {
  let query: Query = { tokens: [], text: [] }
  for (const m of (input ?? '').matchAll(TERM)) {
    const [whole, neg, rawKey, rawValue, phrase, word] = m
    if (rawKey !== undefined) {
      const key = rawKey.toLowerCase()
      const value = rawValue.startsWith('"') ? rawValue.slice(1, -1) : rawValue
      if (isKey(key) && value.trim()) {
        query = addValues(query, key, value.split(','), neg === '-')
        continue
      }
      query.text.push(whole.toLowerCase())
    } else if (phrase !== undefined) {
      if (phrase.trim()) query.text.push(phrase.trim().toLowerCase())
    } else if (word !== undefined) {
      query.text.push(word.toLowerCase())
    }
  }
  return query
}

const quote = (s: string) => (/[\s,"]/.test(s) ? `"${s.replace(/"/g, '')}"` : s)

/** Writes a query back in its syntax; parseQuery(serializeQuery(q)) gives q back. */
export function serializeQuery(query: Query): string {
  const tokens = query.tokens.map((t) => `${t.neg ? '-' : ''}${t.key}:${t.values.map(quote).join(',')}`)
  const text = query.text.map((t) => (/\s/.test(t) ? `"${t}"` : t))
  return [...tokens, ...text].join(' ')
}

/** The value of an event for a query key, as stored (status as a design system status). */
function rawValue(event: Event, key: QueryKey): string | undefined {
  const a = event.attributes
  switch (key) {
    case 'env':
      return a.environment || undefined
    case 'status':
      return toDsStatus(a.status)
    case 'type':
      return a.type || undefined
    case 'owner':
      return a.owner || undefined
    case 'service':
      return a.service || undefined
    case 'priority':
      return a.priority || undefined
    case 'impact':
      return a.impact ? 'true' : 'false'
  }
}

/** The value of an event for a query key, lowercased for matching. */
export function eventValue(event: Event, key: QueryKey): string | undefined {
  return rawValue(event, key)?.toLowerCase()
}

function haystack(event: Event) {
  const a = event.attributes
  return [event.title, a.service, a.owner, a.environment, a.type, a.message].filter(Boolean).join(' ').toLowerCase()
}

/** True when the event matches every token and every text term (ignoring `exceptKey`). */
export function matchEvent(event: Event, query: Query, exceptKey?: QueryKey): boolean {
  for (const token of query.tokens) {
    if (token.key === exceptKey) continue
    const value = eventValue(event, token.key)
    const hit = value !== undefined && token.values.some((v) => v.toLowerCase() === value)
    if (token.neg ? hit : !hit) return false
  }
  if (query.text.length) {
    const text = haystack(event)
    if (!query.text.every((term) => text.includes(term))) return false
  }
  return true
}

/**
 * Values of a key among the events that match the rest of the query, with their count,
 * most frequent first: the "n in view" of the suggestions.
 */
export function countValues(events: Event[], query: Query, key: QueryKey): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    const value = rawValue(event, key)
    if (!value || !matchEvent(event, query, key)) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export interface QuerySearchParams {
  environment?: Environment
  type?: EventType
  priority?: Priority
  service?: string
  impact?: boolean
}

const ENVIRONMENTS = Object.values(Environment) as string[]
const TYPES = Object.values(EventType) as string[]
const PRIORITIES = Object.values(Priority) as string[]

/**
 * The part of the query that SearchEvents can apply on the server: one positive value of
 * env, type, priority or service, and impact:true. Everything else (owner, status, several
 * values, exclusions, text) is filtered on the client with matchEvent.
 */
export function toSearchParams(query: Query): QuerySearchParams {
  const params: QuerySearchParams = {}
  const single = (key: QueryKey) => {
    const tokens = query.tokens.filter((t) => t.key === key)
    return tokens.length === 1 && !tokens[0].neg && tokens[0].values.length === 1 ? tokens[0].values[0] : undefined
  }
  const env = single('env')?.toLowerCase()
  if (env && ENVIRONMENTS.includes(env)) params.environment = env as Environment
  const type = single('type')?.toLowerCase()
  if (type && TYPES.includes(type)) params.type = type as EventType
  const priority = single('priority')?.toLowerCase()
  if (priority && PRIORITIES.includes(priority)) params.priority = priority as Priority
  const service = single('service')
  if (service) params.service = service
  if (single('impact')?.toLowerCase() === 'true') params.impact = true
  return params
}
