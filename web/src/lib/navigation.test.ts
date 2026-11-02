import { describe, expect, it } from 'vitest'
import { activeNavName, NAV_SECTIONS } from './navigation'

describe('navigation', () => {
  it('has the four groups of the brand book', () => {
    expect(NAV_SECTIONS.map((s) => s.label)).toEqual(['operations', 'services', 'infrastructure', 'resources'])
  })

  it('finds the entry of a path, the most specific first', () => {
    expect(activeNavName('/dashboard')).toBe('Dashboard')
    expect(activeNavName('/catalog')).toBe('Catalog')
    expect(activeNavName('/catalog/checkout')).toBe('Catalog')
    expect(activeNavName('/catalog/dependencies')).toBe('Architecture')
    expect(activeNavName('/catalog/version-compliance')).toBe('Compliance')
    expect(activeNavName('/drifts/create')).toBe('Drifts')
    expect(activeNavName('/events/abc')).toBeUndefined()
    expect(activeNavName('/locksmith')).toBeUndefined()
  })
})
