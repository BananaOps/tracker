// Saved views and recent queries of the time views, kept in the browser (localStorage).
// Storage can be missing or throw (private window, blocked site data): every access is
// guarded and the defaults still work.

import { parseQuery, serializeQuery } from './query'

export interface SavedView {
  id: string
  label: string
  /** The query, in its syntax. */
  q: string
  /** Built-in views cannot be deleted. */
  builtIn?: boolean
}

export interface RecentQuery {
  q: string
  /** Epoch milliseconds of the last use. */
  at: number
}

export const DEFAULT_VIEWS: SavedView[] = [
  { id: 'all', label: 'All work', q: '', builtIn: true },
  { id: 'impact', label: 'Impact', q: 'impact:true', builtIn: true },
  { id: 'production-deploys', label: 'Production deploys', q: 'env:production type:deployment', builtIn: true },
]

const VIEWS_KEY = 'tracker.savedViews'
const RECENT_KEY = 'tracker.recentQueries'
const RECENT_MAX = 5

type Store = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): Store | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function read<T>(key: string, store: Store | null): T[] {
  try {
    const raw = store?.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function write(key: string, value: unknown, store: Store | null) {
  try {
    store?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the change lasts for this page only.
  }
}

/** Normal form of a query, so that "env:mco  impact:true" and its rewrite compare equal. */
export const normalizeQuery = (q: string) => serializeQuery(parseQuery(q))

export function loadViews(store: Store | null = defaultStore()): SavedView[] {
  const custom = read<SavedView>(VIEWS_KEY, store).filter((v) => v && typeof v.id === 'string' && typeof v.label === 'string' && typeof v.q === 'string')
  return [...DEFAULT_VIEWS, ...custom.map((v) => ({ id: v.id, label: v.label, q: v.q }))]
}

export function saveView(label: string, q: string, store: Store | null = defaultStore()): SavedView[] {
  const views = loadViews(store)
  const custom = views.filter((v) => !v.builtIn)
  const id = `view-${Date.now().toString(36)}-${custom.length}`
  const next = [...custom, { id, label: label.trim() || 'Untitled view', q: normalizeQuery(q) }]
  write(VIEWS_KEY, next, store)
  return [...DEFAULT_VIEWS, ...next]
}

export function deleteView(id: string, store: Store | null = defaultStore()): SavedView[] {
  const custom = loadViews(store).filter((v) => !v.builtIn && v.id !== id)
  write(VIEWS_KEY, custom, store)
  return [...DEFAULT_VIEWS, ...custom]
}

/** The view showing exactly this query, if any. */
export function currentView(views: SavedView[], q: string): SavedView | undefined {
  const norm = normalizeQuery(q)
  return views.find((v) => normalizeQuery(v.q) === norm)
}

export function loadRecent(store: Store | null = defaultStore()): RecentQuery[] {
  return read<RecentQuery>(RECENT_KEY, store).filter((r) => r && typeof r.q === 'string' && typeof r.at === 'number')
}

/** Remembers a non-empty query as the most recent one (five at most, no duplicates). */
export function pushRecent(q: string, now = Date.now(), store: Store | null = defaultStore()): RecentQuery[] {
  const norm = normalizeQuery(q)
  if (!norm) return loadRecent(store)
  const next = [{ q: norm, at: now }, ...loadRecent(store).filter((r) => r.q !== norm)].slice(0, RECENT_MAX)
  write(RECENT_KEY, next, store)
  return next
}

/** "today", "yesterday", "3 days ago", "last week", "earlier". */
export function relativeDay(at: number, now = Date.now()): string {
  const day = (t: number) => {
    const d = new Date(t)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const days = Math.round((day(now) - day(at)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return 'earlier'
}
