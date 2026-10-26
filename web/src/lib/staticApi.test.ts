import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { staticCatalogApi, staticEventsApi, staticLocksApi } from './staticApi'

const events = {
  events: [
    {
      title: 'deploy',
      attributes: { service: 'api' },
      links: {},
      metadata: { id: 'e1', slackId: '1700000000.000100', createdAt: '2026-01-15T10:00:00Z' },
      changelog: [{ timestamp: '2026-01-15T10:00:00Z', user: 'ci', changeType: 'created' }],
    },
  ],
  totalCount: 1,
}
const catalogs = { catalogs: [{ name: 'api', owner: 'team' }], totalCount: 1 }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => (url.endsWith('events.json') ? events : url.endsWith('catalogs.json') ? catalogs : { locks: [] }),
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('static demo API', () => {
  it('returns the changelog embedded in the demo event', async () => {
    const res = await staticEventsApi.getChangelog('e1')
    expect(res.changelog).toHaveLength(1)
    expect(res.totalCount).toBe(1)
  })

  it('lists today without failing on an event that has no creation date', async () => {
    events.events.push({ title: 'undated', attributes: { service: 'api' }, links: {}, metadata: { id: 'e2' } } as never)
    try {
      const res = await staticEventsApi.today()
      expect(res.events.map((e) => e.title)).not.toContain('undated')
    } finally {
      events.events.pop()
    }
  })

  it('finds an event by id or by Slack id', async () => {
    expect((await staticEventsApi.get('e1')).title).toBe('deploy')
    expect((await staticEventsApi.get('1700000000.000100')).title).toBe('deploy')
  })

  it('rejects unknown events and catalog entries like the real API', async () => {
    await expect(staticEventsApi.get('missing')).rejects.toThrow('not found')
    await expect(staticCatalogApi.get('missing')).rejects.toThrow('not found')
    expect((await staticCatalogApi.get('api')).owner).toBe('team')
  })

  it('refuses every write', async () => {
    await expect(staticEventsApi.addSlackId('e1', 'x')).rejects.toThrow('not available')
    await expect(staticCatalogApi.updateDependencies('api', [], [])).rejects.toThrow('not available')
    await expect(staticLocksApi.unlock('l1')).rejects.toThrow('not available')
  })
})
