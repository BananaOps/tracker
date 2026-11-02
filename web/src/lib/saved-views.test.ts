import { describe, expect, it } from 'vitest'
import { currentView, DEFAULT_VIEWS, deleteView, loadRecent, loadViews, pushRecent, relativeDay, saveView } from './saved-views'

function memoryStore() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('saved views', () => {
  it('starts with the built-in views', () => {
    expect(loadViews(memoryStore()).map((v) => v.label)).toEqual(['All work', 'Impact', 'Production deploys'])
  })

  it('saves, reloads and deletes a view, keeping the built-in ones', () => {
    const store = memoryStore()
    const saved = saveView('  Checkout  ', 'service:checkout   -status:done', store)
    const mine = saved[saved.length - 1]
    expect(mine).toMatchObject({ label: 'Checkout', q: 'service:checkout -status:done' })
    expect(loadViews(store)).toHaveLength(DEFAULT_VIEWS.length + 1)
    expect(deleteView(mine.id, store)).toEqual(DEFAULT_VIEWS)
    expect(deleteView('impact', store)).toEqual(DEFAULT_VIEWS)
  })

  it('finds the view of the current query whatever its spacing or order of values', () => {
    const views = loadViews(memoryStore())
    expect(currentView(views, '')?.id).toBe('all')
    expect(currentView(views, 'env:production   type:deployment')?.id).toBe('production-deploys')
    expect(currentView(views, 'env:mco')).toBeUndefined()
  })

  it('survives a missing, broken or throwing storage', () => {
    expect(loadViews(null)).toEqual(DEFAULT_VIEWS)
    const broken = { getItem: () => '{not json', setItem: () => {} }
    expect(loadViews(broken)).toEqual(DEFAULT_VIEWS)
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(saveView('x', 'env:mco', throwing)).toHaveLength(DEFAULT_VIEWS.length + 1)
  })
})

describe('recent queries', () => {
  it('keeps the five latest distinct queries, newest first, and skips empty ones', () => {
    const store = memoryStore()
    for (let i = 0; i < 7; i++) pushRecent(`service:s${i}`, i, store)
    pushRecent('service:s3', 10, store)
    pushRecent('   ', 11, store)
    expect(loadRecent(store).map((r) => r.q)).toEqual(['service:s3', 'service:s6', 'service:s5', 'service:s4', 'service:s2'])
  })

  it('words how long ago a query was used', () => {
    const now = new Date(2026, 3, 10, 12).getTime()
    expect(relativeDay(new Date(2026, 3, 10, 8).getTime(), now)).toBe('today')
    expect(relativeDay(new Date(2026, 3, 9, 23).getTime(), now)).toBe('yesterday')
    expect(relativeDay(new Date(2026, 3, 6).getTime(), now)).toBe('4 days ago')
    expect(relativeDay(new Date(2026, 3, 1).getTime(), now)).toBe('last week')
    expect(relativeDay(new Date(2026, 2, 1).getTime(), now)).toBe('earlier')
  })
})
