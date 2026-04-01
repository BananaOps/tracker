import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, type ProjectCompliance, type DeliverableUsage } from '../types/api'
import { AlertTriangle, CheckCircle, Package, TrendingUp, Search, X, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function VersionCompliance() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // ── Design tokens ────────────────────────────────────────────────────────────
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:           'rgb(var(--hud-bg))',
    surface:      'rgb(var(--hud-surface))',
    surfaceLow:   'rgb(var(--hud-surface-low))',
    surfaceHigh:  'rgb(var(--hud-surface-high))',
    primary:      'rgb(var(--hud-primary))',
    primaryDim:   'rgb(var(--hud-primary-dim))',
    tertiary:     'rgb(var(--hud-tertiary))',
    error:        'rgb(var(--hud-error))',
    success:      'rgb(var(--hud-success))',
    onSurface:    'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
  }

  const { data: complianceData, isLoading, error } = (useQuery as any)({
    queryKey: ['catalog', 'version-compliance'],
    queryFn: () => catalogApi.getVersionCompliance(),
  })

  const deliverableTypes = [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE]

  const filteredData = useMemo(() => {
    if (!complianceData?.projects) return []
    let filtered = complianceData.projects
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((project: ProjectCompliance) =>
        project.projectName.toLowerCase().includes(query) ||
        project.deliverables.some((d: DeliverableUsage) => d.name.toLowerCase().includes(query))
      )
    }
    if (selectedTypes.length > 0) {
      filtered = filtered.map((project: ProjectCompliance) => ({
        ...project,
        deliverables: project.deliverables.filter((d: DeliverableUsage) =>
          selectedTypes.includes(String(d.type).toLowerCase())
        )
      })).filter((project: ProjectCompliance) => project.deliverables.length > 0)
    }
    return filtered
  }, [complianceData?.projects, searchQuery, selectedTypes])

  const summary = useMemo(() => {
    if (!complianceData?.summary) return { totalProjects: 0, compliantProjects: 0, nonCompliantProjects: 0, neutralProjects: 0, overallCompliance: 0 }
    const projectsWithoutDeliverables = complianceData.projects?.filter((p: ProjectCompliance) => p.totalCount === 0).length || 0
    return {
      totalProjects: complianceData.summary.totalProjects,
      compliantProjects: complianceData.summary.compliantProjects,
      nonCompliantProjects: complianceData.summary.nonCompliantProjects,
      neutralProjects: projectsWithoutDeliverables,
      overallCompliance: Math.round(complianceData.summary.overallCompliancePercentage)
    }
  }, [complianceData?.summary, complianceData?.projects])

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const getComplianceStatus = (project: ProjectCompliance) => {
    if (project.totalCount === 0) return { status: 'neutral', icon: Minus, color: T.onSurfaceVar, label: 'No Deliverables' }
    if (project.compliancePercentage === 100) return { status: 'compliant', icon: CheckCircle, color: T.success, label: 'Compliant' }
    return { status: 'non-compliant', icon: AlertTriangle, color: T.error, label: 'Non-Compliant' }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: T.bg }}>
        <AlertTriangle className="w-12 h-12 mb-4" style={{ color: T.error }} />
        <p className="text-sm" style={{ color: T.error }}>Failed to load version compliance data</p>
      </div>
    )
  }

  const hasFilters = searchQuery || selectedTypes.length > 0

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="max-w-7xl mx-auto p-8">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6" style={{ color: T.primary }} />
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Version Compliance
            </h1>
          </div>
          <p className="text-sm ml-9" style={{ color: T.onSurfaceVar }}>
            Track which projects are using outdated versions of their declared deliverables
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: summary.totalProjects, color: T.primary },
            { label: 'Compliant', value: summary.compliantProjects, color: T.success },
            { label: 'Non-Compliant', value: summary.nonCompliantProjects, color: T.error },
            { label: 'No Deliverables', value: summary.neutralProjects, color: T.onSurfaceVar },
          ].map(({ label, value, color }) => (
            <div key={label} className="relative p-6 rounded-xl overflow-hidden"
              style={{ background: T.surfaceLow, borderLeft: `2px solid ${color}` }}>
              <div className="absolute top-2 right-3 w-12 h-12 rounded-full blur-xl opacity-20 pointer-events-none"
                style={{ background: color }} />
              <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>{label}</p>
              <span className="text-4xl font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="p-5 rounded-xl mb-6" style={{ background: T.surface }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.onSurfaceVar }} />
              <input type="text" placeholder="Search by project or deliverable name..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none border-0 transition-all"
                style={{ background: T.surfaceLow, color: T.onSurface }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70">
                  <X className="w-4 h-4" style={{ color: T.onSurfaceVar }} />
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearchQuery(''); setSelectedTypes([]) }}
              style={{ visibility: hasFilters ? 'visible' : 'hidden', color: T.error }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-all">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest font-bold mr-1" style={{ color: T.onSurfaceVar }}>Type:</span>
            {deliverableTypes.map((type) => {
              const typeStr = String(type).toLowerCase()
              const isActive = selectedTypes.includes(typeStr)
              return (
                <button key={type} onClick={() => toggleTypeFilter(typeStr)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: isActive ? a('primary', 0.15) : a('outline-var', 0.08),
                    color: isActive ? T.primary : T.onSurfaceVar,
                    border: `1px solid ${isActive ? a('primary', 0.4) : a('outline-var', 0.15)}`,
                  }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: T.surface }}>
            <Package className="w-16 h-16 mb-4 opacity-20" style={{ color: T.onSurfaceVar }} />
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No projects found</h3>
            <p className="text-sm" style={{ color: T.onSurfaceVar }}>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
                  {['Project', 'Status', 'Compliance', 'Deliverables', 'Outdated', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: T.onSurfaceVar }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((project: ProjectCompliance) => {
                  const status = getComplianceStatus(project)
                  const StatusIcon = status.icon
                  return (
                    <tr key={project.projectName}
                      onMouseEnter={() => setHoveredRow(project.projectName)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: `1px solid ${a('outline-var', 0.08)}`,
                        background: hoveredRow === project.projectName ? a('outline-var', 0.05) : 'transparent',
                        transition: 'background 0.15s'
                      }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 flex-shrink-0" style={{ color: T.onSurfaceVar }} />
                          <span className="text-sm font-medium">{project.projectName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: `${status.color}18`, color: status.color, border: `1px solid ${status.color}35` }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {project.totalCount === 0 ? (
                          <span className="text-sm" style={{ color: T.onSurfaceVar }}>-</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: status.color }}>
                              {project.compliancePercentage}%
                            </span>
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: a('outline-var', 0.2) }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${project.compliancePercentage}%`, background: status.color }} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {project.totalCount}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold" style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: project.outdatedCount > 0 ? T.error : T.onSurfaceVar
                        }}>
                          {project.outdatedCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => navigate(`/catalog/${project.projectName}`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                          style={{ color: T.primary, background: a('primary', 0.1), border: `1px solid ${a('primary', 0.25)}` }}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decorative glow */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: a('primary', 0.04) }} />
    </div>
  )
}
