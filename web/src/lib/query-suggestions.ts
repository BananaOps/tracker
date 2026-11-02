// Suggestions of the QueryBar, as in docs/design-system/mockups/search-and-filters.dc.html
// and streamline.dc.html: recent queries and keys on an empty field, values with their count
// once a key is typed, otherwise matching values, keys and a free-text search.

import type { Event } from '@/types/api'
import { countValues, KEY_HINTS, matchEvent, parseQuery, QUERY_KEYS, removeToken, serializeQuery, type Query, type QueryKey } from './query'
import { relativeDay, type RecentQuery } from './saved-views'
import { DS_STATUSES, type DsStatus } from './status'

export type SuggestionAction =
  /** Replace the whole query (a recent one). */
  | { kind: 'replace'; query: Query }
  /** Put this text in the field (a key, to type its value next). */
  | { kind: 'type'; text: string }
  /** Add a value to a key. */
  | { kind: 'add'; key: QueryKey; value: string; neg: boolean }
  /** Keep the free text as typed and close. */
  | { kind: 'text' }

export interface Suggestion {
  id: string
  label: string
  hint?: string
  /** Mono label (keys and values) or sans (the free-text item). */
  mono: boolean
  /** Status glyph for status values. */
  status?: DsStatus
  /** Impact marker for impact:true. */
  impact?: boolean
  /** Icon of the free-text item; the others use the filter icon. */
  icon: 'filter' | 'search'
  action: SuggestionAction
}

export interface SuggestionGroup {
  label: string
  items: Suggestion[]
}

const KEY_PATTERN = /^(-?)([a-z]+):(.*)$/

function isKey(k: string): k is QueryKey {
  return (QUERY_KEYS as readonly string[]).includes(k)
}

/** The field text is a key being typed ("status:f", "-env:"): it does not filter yet. */
export function isKeyDraft(text: string): boolean {
  const m = KEY_PATTERN.exec(text.trim().toLowerCase())
  return !!m && isKey(m[2])
}

export function buildSuggestions(text: string, query: Query, events: Event[], recent: RecentQuery[] = [], now = Date.now()): SuggestionGroup[] {
  const draft = text.trim()
  const lower = draft.toLowerCase()
  const groups: SuggestionGroup[] = []
  // The free text of the field is part of the query; counts use the committed tokens only.
  const committed: Query = { tokens: query.tokens, text: [] }

  if (!draft) {
    if (recent.length) {
      groups.push({
        label: 'recent',
        items: recent.map((r) => ({
          id: `recent:${r.q}`,
          label: r.q,
          hint: relativeDay(r.at, now),
          mono: true,
          icon: 'filter',
          action: { kind: 'replace', query: parseQuery(r.q) },
        })),
      })
    }
    const impactCount = events.filter((e) => e.attributes.impact && matchEvent(e, committed, 'impact')).length
    groups.push({
      label: 'filter by',
      items: QUERY_KEYS.map((key) =>
        key === 'impact'
          ? {
              id: 'key:impact',
              label: 'impact:true',
              hint: `${impactCount} ${impactCount === 1 ? 'event touches' : 'events touch'} users`,
              mono: true,
              impact: true,
              icon: 'filter' as const,
              action: { kind: 'add' as const, key: 'impact' as const, value: 'true', neg: false },
            }
          : { id: `key:${key}`, label: `${key}:`, hint: KEY_HINTS[key], mono: true, icon: 'filter' as const, action: { kind: 'type' as const, text: `${key}:` } },
      ),
    })
    return groups
  }

  const keyMatch = KEY_PATTERN.exec(lower)
  if (keyMatch && isKey(keyMatch[2])) {
    const neg = keyMatch[1] === '-'
    const key = keyMatch[2]
    const part = keyMatch[3].trim()
    let values = countValues(events, committed, key)
    if (key === 'status') {
      // Every status can be asked for, even with nothing in view.
      const seen = new Set(values.map((v) => v.value))
      values = [...values, ...DS_STATUSES.filter((s) => !seen.has(s)).map((s) => ({ value: s, count: 0 }))]
    }
    if (key === 'impact' && !values.some((v) => v.value === 'true')) values = [{ value: 'true', count: 0 }, ...values]
    const items = values
      .filter((v) => !part || v.value.toLowerCase().includes(part))
      .map((v) => ({
        id: `value:${key}:${v.value}`,
        label: v.value,
        hint: `${v.count} in view`,
        mono: true,
        status: key === 'status' ? (v.value as DsStatus) : undefined,
        icon: 'filter' as const,
        action: { kind: 'add' as const, key, value: v.value, neg },
      }))
    // A value nobody has yet can still be added as typed.
    if (part && items.length === 0) {
      const typed = draft.slice(draft.indexOf(':') + 1).trim()
      items.push({
        id: `value:${key}:${typed}`,
        label: typed,
        hint: '0 in view',
        mono: true,
        status: undefined,
        icon: 'filter',
        action: { kind: 'add', key, value: typed, neg },
      })
    }
    groups.push({ label: `${neg ? 'exclude ' : ''}${key}`, items })
    return groups
  }

  const direct: Suggestion[] = []
  for (const key of ['service', 'owner', 'env', 'type'] as QueryKey[]) {
    for (const { value, count } of countValues(events, committed, key)) {
      if (value.toLowerCase().includes(lower)) {
        direct.push({ id: `direct:${key}:${value}`, label: `${key}:${value}`, hint: `${count} in view`, mono: true, icon: 'filter', action: { kind: 'add', key, value, neg: false } })
      }
    }
  }
  if (direct.length) groups.push({ label: 'filter by value', items: direct.slice(0, 5) })

  const keys = QUERY_KEYS.filter((k) => k.startsWith(lower))
  if (keys.length) {
    groups.push({
      label: 'keys',
      items: keys.map((k) => ({ id: `key:${k}`, label: `${k}:`, hint: KEY_HINTS[k], mono: true, icon: 'filter', action: { kind: 'type', text: `${k}:` } })),
    })
  }

  const withText: Query = { tokens: query.tokens, text: parseQuery(draft).text }
  const inView = events.filter((e) => matchEvent(e, withText)).length
  groups.push({
    label: 'text',
    items: [{ id: 'text', label: `Titles, services and teams containing “${draft}”`, hint: `${inView} in view`, mono: false, icon: 'search', action: { kind: 'text' } }],
  })
  return groups
}

export interface Relaxation {
  /** The token in its syntax, e.g. "status:failed". */
  label: string
  /** Query without this token. */
  query: Query
  count: number
}

/** For an empty result: what each token would give back if removed ("try without …"). */
export function relaxations(events: Event[], query: Query): Relaxation[] {
  return query.tokens
    .map((token, i) => {
      const without = removeToken(query, i)
      return {
        label: serializeQuery({ tokens: [token], text: [] }),
        query: without,
        count: events.filter((e) => matchEvent(e, without)).length,
      }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => a.count - b.count)
}
