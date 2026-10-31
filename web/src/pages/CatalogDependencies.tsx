import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Graph, layout } from '@dagrejs/dagre'
import { Search, X, ExternalLink, Server, Zap, Activity, Package, GitBranch, Cloud } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDocker } from '@fortawesome/free-brands-svg-icons'
import { catalogListQuery } from '../lib/queries'
import { buildDependencyGraph, reachable, type DependencyNode } from '../lib/dependencyGraph'
import { useTheme } from '../contexts/theme'
import { KubernetesIcon } from '../components/icons/KubernetesIcon'
import { SLALevel, Platform, type Catalog } from '../types/api'

const NODE_WIDTH = 200
const NODE_HEIGHT = 52

// Colors that have to be real values (SVG markers, minimap), per theme.
// Depends-on and used-by come from the event palette, validated together.
const COLORS = {
  light: { edge: '#a3adc2', upstream: '#3A63A8', downstream: '#0F9E95' },
  dark: { edge: '#4e5875', upstream: '#5B86D6', downstream: '#14A99F' },
}
const SELECTED = '#FFC83D'
// Below this zoom the names are no longer readable: a larger graph is shown
// from its top left corner (the entry points) and explored with the minimap.
const MIN_READABLE_ZOOM = 0.6
const FRAME_PADDING = 32

type Role = 'selected' | 'upstream' | 'downstream' | 'dimmed' | 'normal'

interface ServiceNodeData {
  node: DependencyNode
  role: Role
  color?: string
}

function ServiceNode({ data }: NodeProps<ServiceNodeData>) {
  const { node, role, color } = data
  const catalog = node.catalog
  const ghost = !catalog
  const border = role === 'selected' ? SELECTED : color ?? 'rgb(var(--hud-outline-var))'
  return (
    <div
      title={node.name}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: ghost ? 'rgb(var(--hud-surface-low))' : 'rgb(var(--hud-surface))',
        border: `${role === 'normal' || role === 'dimmed' ? 1 : 2}px ${ghost ? 'dashed' : 'solid'} ${border}`,
        borderRadius: 8,
        opacity: role === 'dimmed' ? 0.25 : 1,
        transition: 'opacity 150ms',
      }}
      className="flex items-center gap-2.5 px-3"
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="shrink-0" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
        {ghost ? <Cloud className="w-4 h-4" /> : platformIcon(catalog.platform)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold truncate" style={{ color: ghost ? 'rgb(var(--hud-on-surface-var))' : 'rgb(var(--hud-on-surface))' }}>
          {node.name}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] truncate" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
          {ghost ? 'outside the catalog' : (
            <>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: slaColor(catalog.sla?.level) }} />
              {slaLabel(catalog.sla?.level)}
              {catalog.platform && <> · {platformLabel(catalog.platform)}</>}
            </>
          )}
        </span>
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { service: ServiceNode }

export default function CatalogDependencies() {
  return (
    <ReactFlowProvider>
      <Architecture />
    </ReactFlowProvider>
  )
}

function Architecture() {
  const navigate = useNavigate()
  const { effectiveTheme } = useTheme()
  const colors = COLORS[effectiveTheme]
  const { setViewport } = useReactFlow()
  const viewWidth = useStore(s => s.width)
  const viewHeight = useStore(s => s.height)
  const [ready, setReady] = useState(false)

  const [types, setTypes] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [showIsolated, setShowIsolated] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [transitive, setTransitive] = useState(true)
  const [query, setQuery] = useState('')

  const { data, isLoading } = useQuery(catalogListQuery)
  const catalogs = useMemo(() => data?.catalogs ?? [], [data])
  const graph = useMemo(() => buildDependencyGraph(catalogs), [catalogs])

  const typeOptions = useMemo(() => uniqueSorted(catalogs.map(c => String(c.type).toLowerCase())), [catalogs])
  const platformOptions = useMemo(
    () => uniqueSorted(catalogs.filter(c => c.platform).map(c => String(c.platform).toLowerCase())), [catalogs])

  // The graph after filters: catalog entries that pass them, the dependencies
  // outside the catalog they link to, and only the edges between those.
  const visible = useMemo(() => {
    const passes = (c: Catalog) =>
      (types.length === 0 || types.includes(String(c.type).toLowerCase())) &&
      (platforms.length === 0 || (c.platform !== undefined && platforms.includes(String(c.platform).toLowerCase())))
    const kept = new Set([...graph.nodes.values()].filter(n => n.catalog && passes(n.catalog)).map(n => n.name))
    const edges = graph.edges.filter(e =>
      (kept.has(e.from) || !graph.nodes.get(e.from)?.catalog) &&
      (kept.has(e.to) || !graph.nodes.get(e.to)?.catalog) &&
      (kept.has(e.from) || kept.has(e.to)))
    const linked = new Set(edges.flatMap(e => [e.from, e.to]))
    const isolated = [...kept].filter(name => !linked.has(name))
    const names = new Set([...linked, ...(showIsolated ? isolated : [])])
    return { names, edges, isolatedCount: isolated.length }
  }, [graph, types, platforms, showIsolated])

  const positions = useMemo(() => layoutGraph(visible.names, visible.edges), [visible])

  const focus = useMemo(() => {
    if (!selected || !visible.names.has(selected)) return null
    return {
      upstream: reachable(visible.edges, selected, 'upstream', transitive),
      downstream: reachable(visible.edges, selected, 'downstream', transitive),
    }
  }, [selected, visible, transitive])

  const roleOf = (name: string): Role => {
    if (!focus) return 'normal'
    if (name === selected) return 'selected'
    if (focus.upstream.has(name)) return 'upstream'
    if (focus.downstream.has(name)) return 'downstream'
    return 'dimmed'
  }

  const nodes: Node<ServiceNodeData>[] = [...visible.names].map(name => {
    const role = roleOf(name)
    return {
      id: name,
      type: 'service',
      position: positions.get(name) ?? { x: 0, y: 0 },
      data: {
        node: graph.nodes.get(name)!,
        role,
        color: role === 'upstream' ? colors.upstream : role === 'downstream' ? colors.downstream : undefined,
      },
      draggable: false,
    }
  })

  const edges: Edge[] = visible.edges.map(e => {
    // Lit edges link the selected service to what it depends on, or what
    // depends on it to the selected service, through lit services only.
    const isUp = focus !== null && (e.from === selected || focus.upstream.has(e.from)) && focus.upstream.has(e.to)
    const isDown = focus !== null && focus.downstream.has(e.from) && (e.to === selected || focus.downstream.has(e.to))
    const lit = isUp || isDown
    const color = isUp ? colors.upstream : isDown ? colors.downstream : colors.edge
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      style: {
        stroke: color,
        strokeWidth: lit ? 2 : 1.25,
        strokeDasharray: e.oneSided ? '5 4' : undefined,
        opacity: focus && !lit ? 0.15 : 1,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      zIndex: lit ? 1 : 0,
    }
  })

  const select = (name: string | null) => setSelected(name)

  // Frame the selected service with what it depends on and what depends on
  // it, or the whole graph without selection. Positions and sizes are known,
  // so the frame does not wait for React Flow to measure the nodes, and it
  // follows the size of the view (which shrinks when the panel opens).
  useEffect(() => {
    if (!ready || viewWidth === 0 || viewHeight === 0) return
    const ids = focus && selected ? [selected, ...focus.upstream, ...focus.downstream] : [...visible.names]
    const boxes = ids.map(id => positions.get(id)).filter(p => p !== undefined)
    if (boxes.length === 0) return
    const x = Math.min(...boxes.map(p => p.x))
    const y = Math.min(...boxes.map(p => p.y))
    const width = Math.max(...boxes.map(p => p.x)) + NODE_WIDTH - x
    const height = Math.max(...boxes.map(p => p.y)) + NODE_HEIGHT - y
    const fit = Math.min((viewWidth - 2 * FRAME_PADDING) / width, (viewHeight - 2 * FRAME_PADDING) / height)
    const zoom = Math.min(Math.max(fit, MIN_READABLE_ZOOM), 1.2)
    // Too large to read whole: center the selected service, or show the
    // graph from its entry points.
    const center = fit >= MIN_READABLE_ZOOM ? { x: x + width / 2, y: y + height / 2 }
      : selected && positions.get(selected) ? { x: positions.get(selected)!.x + NODE_WIDTH / 2, y: positions.get(selected)!.y + NODE_HEIGHT / 2 }
      : null
    const viewport = center
      ? { x: viewWidth / 2 - center.x * zoom, y: viewHeight / 2 - center.y * zoom, zoom }
      : { x: FRAME_PADDING - x * zoom, y: FRAME_PADDING - y * zoom, zoom }
    setViewport(viewport, { duration: 300 })
  }, [ready, viewWidth, viewHeight, visible, positions, focus, selected, setViewport])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? [...visible.names].filter(n => n.toLowerCase().includes(q)).sort().slice(0, 8) : []
  }, [query, visible])

  const ghosts = [...graph.nodes.values()].filter(n => !n.catalog).length
  const oneSided = graph.edges.filter(e => e.oneSided).length
  const selectedNode = selected ? graph.nodes.get(selected) : undefined

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <GitBranch className="w-8 h-8 animate-pulse" style={{ color: 'rgb(var(--hud-primary))' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pt-4 pb-12 lg:px-6 lg:pt-6 gap-4 bg-hud-bg text-hud-on-surface">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Architecture</h1>
          <p className="text-sm mt-0.5 text-hud-on-surface-var">
            {catalogs.length} services · {graph.edges.length} dependencies
            {ghosts > 0 && <> · {ghosts} outside the catalog</>}
            {oneSided > 0 && <> · {oneSided} declared on one side only</>}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hud-on-surface-var" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && matches[0]) { select(matches[0]); setQuery('') }
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Find a service…"
            aria-label="Find a service"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-hud-surface border border-hud-outline-var/60 focus:outline-hidden focus:border-hud-primary"
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-lg border border-hud-outline-var/60 bg-hud-surface shadow-ig-dropdown py-1">
              {matches.map(name => (
                <li key={name}>
                  <button type="button" onClick={() => { select(name); setQuery('') }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-hud-surface-high">
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Filters and legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <ChipGroup label="Type" options={typeOptions} selected={types} onChange={setTypes} format={typeLabel} />
        <ChipGroup label="Platform" options={platformOptions} selected={platforms} onChange={setPlatforms}
          format={p => platformLabel(p as Platform)} />
        {visible.isolatedCount > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer text-hud-on-surface-var">
            <input type="checkbox" checked={showIsolated} onChange={e => setShowIsolated(e.target.checked)} />
            Show {visible.isolatedCount} without dependencies
          </label>
        )}
        <span className="flex items-center gap-4 ml-auto text-hud-on-surface-var">
          <span>A → B: A depends on B</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed" style={{ borderColor: colors.edge }} />one side only</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-dashed border-hud-outline" />outside the catalog</span>
        </span>
      </div>

      {/* Graph, and the details of the selected service beside it */}
      <div className="flex flex-1 min-h-[480px] gap-3">
        <div className="relative flex-1 min-w-0 rounded-xl overflow-hidden border border-hud-outline-var/40 bg-hud-surface">
          {visible.names.size === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <GitBranch className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No dependency to show</p>
              <p className="text-xs mt-1 text-hud-on-surface-var">
                Declare dependencies on the services of the catalog, or clear the filters.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => select(n.id === selected ? null : n.id)}
              onNodeDoubleClick={(_, n) => graph.nodes.get(n.id)?.catalog && navigate(`/catalog/${n.id}`)}
              onPaneClick={() => setSelected(null)}
              onInit={() => setReady(true)}
              nodesConnectable={false}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="rgb(var(--hud-outline-var))" gap={20} size={1} />
              <Controls showInteractive={false} />
              {/* The minimap helps to explore the whole graph; in focus it would
                  hide part of the framed neighbourhood. */}
              {!focus && (
                <MiniMap pannable zoomable nodeColor={colors.edge}
                  style={{ background: 'rgb(var(--hud-surface-low))', width: 160, height: 110 }}
                  maskColor={effectiveTheme === 'dark' ? 'rgb(0 0 0 / 0.45)' : 'rgb(0 0 0 / 0.06)'} />
              )}
            </ReactFlow>
          )}
        </div>

        {selectedNode && focus && (
          <FocusPanel
            node={selectedNode}
            upstream={focus.upstream}
            downstream={focus.downstream}
            edges={visible.edges}
            transitive={transitive}
            onTransitive={setTransitive}
            colors={colors}
            onSelect={select}
            onOpen={() => navigate(`/catalog/${selectedNode.name}`)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

function FocusPanel({ node, upstream, downstream, edges, transitive, onTransitive, colors, onSelect, onOpen, onClose }: {
  node: DependencyNode
  upstream: Set<string>
  downstream: Set<string>
  edges: { from: string; to: string; oneSided: boolean }[]
  transitive: boolean
  onTransitive: (v: boolean) => void
  colors: { upstream: string; downstream: string }
  onSelect: (name: string) => void
  onOpen: () => void
  onClose: () => void
}) {
  const c = node.catalog
  const oneSidedWith = new Set(edges.filter(e => e.oneSided && (e.from === node.name || e.to === node.name))
    .map(e => (e.from === node.name ? e.to : e.from)))
  const list = (title: string, names: Set<string>, color: string, empty: string) => (
    <section>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-hud-on-surface-var mb-1.5">
        <span className="w-2 h-2 rounded-xs" style={{ background: color }} />{title}
        <span className="ml-auto tabular-nums">{names.size}</span>
      </h3>
      {names.size === 0 ? <p className="text-xs text-hud-on-surface-var">{empty}</p> : (
        <ul className="space-y-0.5">
          {[...names].sort().map(name => (
            <li key={name}>
              <button type="button" onClick={() => onSelect(name)}
                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-hud-surface-high flex items-center gap-2">
                <span className="truncate">{name}</span>
                {oneSidedWith.has(name) && <span className="ml-auto text-[10px] text-hud-on-surface-var">one side only</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
  return (
    <aside aria-label="Service details" className="w-72 shrink-0 flex flex-col rounded-xl border border-hud-outline-var/40 bg-hud-surface">
      <div className="flex items-start gap-2 p-4 border-b border-hud-outline-var/40">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold truncate" title={node.name}>{node.name}</h2>
          <p className="text-xs text-hud-on-surface-var mt-0.5">
            {c ? [typeLabel(String(c.type)), c.platform && platformLabel(c.platform), c.owner].filter(Boolean).join(' · ') : 'Not in the catalog'}
          </p>
          {c && (
            <p className="flex items-center gap-1.5 text-xs mt-1">
              <span className="w-2 h-2 rounded-full" style={{ background: slaColor(c.sla?.level) }} />SLA {slaLabel(c.sla?.level)}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-hud-surface-high text-hud-on-surface-var">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 p-3 text-xs" role="group" aria-label="Depth">
        {([[false, 'Direct'], [true, 'All levels']] as const).map(([value, label]) => (
          <button key={label} type="button" onClick={() => onTransitive(value)}
            className={`flex-1 py-1 rounded-md border ${transitive === value ? 'bg-hud-primary text-white border-hud-primary' : 'border-hud-outline-var/60 text-hud-on-surface-var hover:bg-hud-surface-high'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {list('Depends on', upstream, colors.upstream, 'No dependency.')}
        {list(transitive ? 'Impacted if it fails' : 'Used by', downstream, colors.downstream, 'Nothing depends on it.')}
      </div>
      {c && (
        <div className="p-3 border-t border-hud-outline-var/40">
          <button type="button" onClick={onOpen} className="btn-secondary w-full gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />Open service page
          </button>
        </div>
      )}
    </aside>
  )
}

function ChipGroup({ label, options, selected, onChange, format }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  format: (v: string) => string
}) {
  if (options.length < 2) return null
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-semibold text-hud-on-surface-var mr-0.5">{label}</span>
      {options.map(o => {
        const on = selected.includes(o)
        return (
          <button key={o} type="button" aria-pressed={on}
            onClick={() => onChange(on ? selected.filter(v => v !== o) : [...selected, o])}
            className={`px-2.5 py-1 rounded-full border ${on ? 'bg-hud-primary text-white border-hud-primary' : 'border-hud-outline-var/60 text-hud-on-surface-var hover:bg-hud-surface-high'}`}>
            {format(o)}
          </button>
        )
      })}
    </span>
  )
}

// Left to right layers: services that nothing depends on (entry points) on
// the left, what they depend on to the right.
function layoutGraph(names: Set<string>, edges: { from: string; to: string }[]) {
  const g = new Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 18, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const name of names) g.setNode(name, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const e of edges) g.setEdge(e.from, e.to)
  layout(g)
  const positions = new Map<string, { x: number; y: number }>()
  for (const name of names) {
    const { x, y } = g.node(name)
    positions.set(name, { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 })
  }
  return positions
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort()
}

function slaColor(level?: SLALevel): string {
  switch (level) {
    case SLALevel.CRITICAL: return '#dc2626'
    case SLALevel.HIGH: return '#ea580c'
    case SLALevel.MEDIUM: return '#ca8a04'
    case SLALevel.LOW: return '#16a34a'
    default: return '#94a3b8'
  }
}

function slaLabel(level?: SLALevel): string {
  switch (level) {
    case SLALevel.CRITICAL: return 'Critical'
    case SLALevel.HIGH: return 'High'
    case SLALevel.MEDIUM: return 'Medium'
    case SLALevel.LOW: return 'Low'
    default: return 'No SLA'
  }
}

function typeLabel(type: string): string {
  const t = type.toLowerCase()
  return t === 'rpa_usage' ? 'RPA' : t.charAt(0).toUpperCase() + t.slice(1)
}

function platformIcon(platform?: Platform) {
  const cls = 'w-4 h-4'
  switch (platform) {
    case Platform.KUBERNETES: return <KubernetesIcon className={cls} />
    case Platform.ECS:
    case Platform.FARGATE: return <FontAwesomeIcon icon={faDocker} className={cls} />
    case Platform.LAMBDA:
    case Platform.CLOUD_RUN:
    case Platform.EVENT_BRIDGE: return <Zap className={cls} />
    case Platform.RDS:
    case Platform.DYNAMODB:
    case Platform.CLOUDFRONT:
    case Platform.CLOUDWATCH: return <Activity className={cls} />
    case Platform.S3: return <Package className={cls} />
    case Platform.API_GATEWAY:
    case Platform.STEP_FUNCTIONS:
    case Platform.HYBRID: return <GitBranch className={cls} />
    default: return <Server className={cls} />
  }
}

function platformLabel(platform?: Platform | string): string {
  const labels: Record<string, string> = {
    [Platform.EC2]: 'EC2/VM', [Platform.LAMBDA]: 'Lambda', [Platform.KUBERNETES]: 'Kubernetes', [Platform.ECS]: 'ECS',
    [Platform.FARGATE]: 'Fargate', [Platform.CLOUD_RUN]: 'Cloud Run', [Platform.APP_SERVICE]: 'App Service',
    [Platform.STEP_FUNCTIONS]: 'Step Functions', [Platform.EVENT_BRIDGE]: 'EventBridge', [Platform.RDS]: 'RDS',
    [Platform.DYNAMODB]: 'DynamoDB', [Platform.S3]: 'S3', [Platform.CLOUDFRONT]: 'CloudFront',
    [Platform.API_GATEWAY]: 'API Gateway', [Platform.CLOUDWATCH]: 'CloudWatch', [Platform.ON_PREMISE]: 'On-premise',
    [Platform.HYBRID]: 'Hybrid', [Platform.MULTI_CLOUD]: 'Multi-cloud',
  }
  return (platform && labels[String(platform).toLowerCase()]) || 'Unknown'
}
