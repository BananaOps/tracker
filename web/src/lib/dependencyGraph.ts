import type { Catalog } from '../types/api'

// A dependency A -> B reads "A depends on B". The catalog stores each link on
// both sides: B in A.dependenciesIn (upstream of A) and A in B.dependenciesOut
// (downstream of B). Either side may be missing.

export interface DependencyEdge {
  id: string
  from: string
  to: string
  // Both ends are in the catalog but only one of them declares the link.
  oneSided: boolean
}

export interface DependencyNode {
  name: string
  // Undefined for a dependency that is not in the catalog.
  catalog?: Catalog
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: DependencyEdge[]
}

export function buildDependencyGraph(catalogs: Catalog[]): DependencyGraph {
  const nodes = new Map<string, DependencyNode>()
  for (const catalog of catalogs) nodes.set(catalog.name, { name: catalog.name, catalog })

  // from -> to -> sides that declare the link
  const declared = new Map<string, { from: string; to: string; byFrom: boolean; byTo: boolean }>()
  const declare = (from: string, to: string, side: 'byFrom' | 'byTo') => {
    if (!from || !to || from === to) return
    const id = `${from}->${to}`
    const link = declared.get(id) ?? { from, to, byFrom: false, byTo: false }
    link[side] = true
    declared.set(id, link)
  }
  for (const catalog of catalogs) {
    for (const upstream of catalog.dependenciesIn ?? []) declare(catalog.name, upstream, 'byFrom')
    for (const downstream of catalog.dependenciesOut ?? []) declare(downstream, catalog.name, 'byTo')
  }

  const edges: DependencyEdge[] = []
  for (const [id, link] of declared) {
    for (const name of [link.from, link.to]) {
      if (!nodes.has(name)) nodes.set(name, { name })
    }
    const bothInCatalog = Boolean(nodes.get(link.from)?.catalog && nodes.get(link.to)?.catalog)
    edges.push({ id, from: link.from, to: link.to, oneSided: bothInCatalog && !(link.byFrom && link.byTo) })
  }
  return { nodes, edges }
}

// Names reachable from start by following edges forward (what start depends
// on) or backward (what depends on start), one level or all of them.
export function reachable(edges: DependencyEdge[], start: string, direction: 'upstream' | 'downstream', transitive: boolean): Set<string> {
  const next = new Map<string, string[]>()
  for (const e of edges) {
    const [a, b] = direction === 'upstream' ? [e.from, e.to] : [e.to, e.from]
    next.set(a, [...(next.get(a) ?? []), b])
  }
  const found = new Set<string>()
  let frontier = [start]
  while (frontier.length > 0) {
    const level: string[] = []
    for (const name of frontier) {
      for (const n of next.get(name) ?? []) {
        if (n !== start && !found.has(n)) {
          found.add(n)
          level.push(n)
        }
      }
    }
    if (!transitive) break
    frontier = level
  }
  return found
}
