import { describe, expect, it } from 'vitest'
import { buildDependencyGraph, reachable } from './dependencyGraph'
import type { Catalog } from '../types/api'

const catalog = (name: string, dependenciesIn: string[] = [], dependenciesOut: string[] = []) =>
  ({ name, dependenciesIn, dependenciesOut }) as unknown as Catalog

describe('buildDependencyGraph', () => {
  it('merges the two declarations of a link into one edge', () => {
    const { edges } = buildDependencyGraph([catalog('web', ['api']), catalog('api', [], ['web'])])
    expect(edges).toEqual([{ id: 'web->api', from: 'web', to: 'api', oneSided: false }])
  })

  it('flags a link declared by one side only', () => {
    const fromUpstream = buildDependencyGraph([catalog('web'), catalog('api', [], ['web'])])
    expect(fromUpstream.edges).toEqual([{ id: 'web->api', from: 'web', to: 'api', oneSided: true }])
    const fromDownstream = buildDependencyGraph([catalog('web', ['api']), catalog('api')])
    expect(fromDownstream.edges[0].oneSided).toBe(true)
  })

  it('adds dependencies outside the catalog as nodes without catalog entry', () => {
    const { nodes, edges } = buildDependencyGraph([catalog('api', ['stripe'])])
    expect(nodes.get('stripe')).toEqual({ name: 'stripe' })
    expect(nodes.get('api')?.catalog?.name).toBe('api')
    expect(edges[0]).toMatchObject({ from: 'api', to: 'stripe', oneSided: false })
  })

  it('ignores self links and empty names', () => {
    expect(buildDependencyGraph([catalog('api', ['api', ''])]).edges).toEqual([])
  })
})

describe('reachable', () => {
  // web -> api -> db, worker -> api, and a cycle db -> api
  const { edges } = buildDependencyGraph([
    catalog('web', ['api']), catalog('worker', ['api']), catalog('api', ['db']), catalog('db', ['api']),
  ])

  it('follows what a service depends on', () => {
    expect(reachable(edges, 'web', 'upstream', false)).toEqual(new Set(['api']))
    expect(reachable(edges, 'web', 'upstream', true)).toEqual(new Set(['api', 'db']))
  })

  it('follows what depends on a service, through cycles', () => {
    expect(reachable(edges, 'db', 'downstream', false)).toEqual(new Set(['api']))
    expect(reachable(edges, 'db', 'downstream', true)).toEqual(new Set(['api', 'web', 'worker']))
  })
})
