import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { Calendar, Clock, Table, GitBranch, Bot, LayoutDashboard, Rocket, Package, AlertTriangle, BookOpen, MessageSquare, Lock, BarChart3, ChevronLeft, ChevronRight, Link as LinkIcon, Plus, Users, Shield, KeyRound } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import { useState, useRef, useEffect, type MouseEvent, type ComponentType } from 'react'
import ThemeToggle from './ThemeToggle'
import OpenSourceBanner from './OpenSourceBanner'
import StaticModeBanner from './StaticModeBanner'
import DemoBanner from './DemoBanner'
import Footer from './Footer'
import LinksSearch from './LinksSearch'
import CreatePanelHost from './CreatePanelHost'
import { useCreatePanel } from '../contexts/CreatePanelContext'
import { getSlackEventsChannelUrl } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { Can } from './auth/Can'
import { UserMenu } from './auth/UserMenu'
import type { Permission } from '../types/auth'

interface NavItem {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  /** Hidden from the sidebar when the principal lacks it. Public when omitted. */
  permission?: Permission
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navigationSections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { name: 'Dashboard',   href: '/dashboard',         icon: LayoutDashboard, permission: 'event:read' },
      { name: 'Timeline',    href: '/events/timeline',   icon: Clock,           permission: 'event:read' },
      { name: 'Streamline',  href: '/events/streamline', icon: Package,         permission: 'event:read' },
      { name: 'Calendar',    href: '/events/calendar',   icon: Calendar,        permission: 'event:read' },
      { name: 'Overlaps',    href: '/events/overlaps',   icon: AlertTriangle,   permission: 'event:read' },
      { name: 'Insights',    href: '/insights',          icon: BarChart3,       permission: 'event:read' },
    ],
  },
  {
    label: 'Services',
    items: [
      { name: 'Catalog',      href: '/catalog',              icon: Table, permission: 'catalog:read' },
      { name: 'Architecture', href: '/catalog/dependencies', icon: ({ className }: { className?: string }) => <span className={`inline-flex items-center justify-center ${className || ''}`}><i className="fa-solid fa-chart-diagram text-[13px]" /></span>, permission: 'catalog:read' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'Drifts',    href: '/drifts', icon: GitBranch, permission: 'event:read' },
      { name: 'RPA Usage', href: '/rpa',    icon: Bot,       permission: 'event:read' },
      { name: 'Locks',     href: '/locks',  icon: Lock,      permission: 'lock:read' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { name: 'Links', href: '/links', icon: LinkIcon, permission: 'links:read' },
      { name: 'Docs',  href: '/docs',  icon: BookOpen },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Users',    href: '/admin/users',    icon: Users,    permission: 'access:manage' },
      { name: 'Teams',    href: '/admin/teams',    icon: Shield,   permission: 'access:manage' },
      { name: 'API keys', href: '/admin/api-keys', icon: KeyRound, permission: 'access:manage' },
    ],
  },
]

export default function Layout() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { open } = useCreatePanel()
  const bannersRef = useRef<HTMLDivElement>(null)
  const [bannersHeight, setBannersHeight] = useState(0)
  const { principal, hasPermission } = useAuth()
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0)

  // Mesurer la hauteur des banneaux et la mettre à jour si elle change
  useEffect(() => {
    const el = bannersRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setBannersHeight(el.offsetHeight)
    })
    observer.observe(el)
    setBannersHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

  const isActiveRoute = (href: string) => location.pathname === href

  const navItem = 'flex items-center px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer select-none'
  const navActive = 'bg-white/10 text-white'
  const navInactive = 'text-white/45 hover:text-white/80 hover:bg-white/[0.06]'

  if (principal.mustChangePassword && location.pathname !== '/account/password') {
    return <Navigate to="/account/password" replace />
  }

  return (
    <div className="min-h-screen bg-hud-bg">
      {/* Banneaux sticky en haut */}
      <div ref={bannersRef} className="fixed top-0 left-0 right-0 z-50">
        <DemoBanner />
        <OpenSourceBanner />
        <StaticModeBanner />
      </div>

      <div className="flex">
        {/* Sidebar — fixed, décalée sous les banneaux */}
        <aside
          className={`${isCollapsed ? 'w-[56px]' : 'w-[220px]'} flex flex-col fixed z-40 transition-all duration-200 bg-[#0F1629]`}
          style={{
            borderRight: '1px solid rgba(255,255,255,0.06)',
            top: bannersHeight,
            height: `calc(100vh - ${bannersHeight}px)`,
          }}
        >
          {/* Logo */}
          <div
            className={`flex items-center h-[56px] px-5 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-[#E8580A]"
              >
                <Rocket className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
            {!isCollapsed && (
                <span className="text-[16px] font-bold text-white tracking-tight truncate">Tracker</span>
              )}
            </Link>
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-[60px] w-6 h-6 rounded-full flex items-center justify-center transition-colors z-50"
            style={{
              background: 'rgb(var(--hud-surface))',
              border: '1px solid rgb(var(--hud-outline-var))',
              boxShadow: '0 1px 3px rgb(0 0 0 / 0.08)',
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-hud-on-surface-var" />
              : <ChevronLeft  className="w-3.5 h-3.5 text-hud-on-surface-var" />
            }
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-4 no-scrollbar">
            {visibleSections.map((section) => (
              <div key={section.label}>
                {!isCollapsed && (
                  <p className="px-2 mb-2 text-[10px] font-medium text-white/25 tracking-widest uppercase select-none">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = isActiveRoute(item.href)
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${navItem} ${isCollapsed ? 'justify-center' : ''} ${isActive ? navActive : navInactive}`}
                        title={isCollapsed ? item.name : ''}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isCollapsed ? '' : 'mr-2.5'} ${isActive ? 'text-[#E8580A]' : ''}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                        {!isCollapsed && isActive && <span className="w-1 h-3.5 rounded-full ml-auto bg-[#E8580A] opacity-80" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className={`px-2 py-2 space-y-1 ${isCollapsed ? 'items-center' : ''}`}>
              {getSlackEventsChannelUrl() && (
                <a
                  href={getSlackEventsChannelUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${navItem} ${isCollapsed ? 'justify-center' : ''} ${navInactive}`}
                  title={isCollapsed ? 'Events Channel' : ''}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isCollapsed ? '' : 'mr-2.5'}`} />
                  {!isCollapsed && <span className="truncate">Events Channel</span>}
                </a>
              )}
              <div className="flex justify-center">
                <ThemeToggle compact={isCollapsed} />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content — décalé sous les banneaux et à droite de la sidebar */}
        <div
          className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200 ${isCollapsed ? 'ml-[56px]' : 'ml-[220px]'}`}
          style={{ paddingTop: bannersHeight }}
        >
          {/* Top Bar */}
          <header
            className="h-[52px] shrink-0 flex items-center justify-between px-5 relative z-50"
            style={{
              background: 'rgb(var(--hud-surface))',
              borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.65)',
            }}
          >
            <div className="flex-1 max-w-xl">
              <LinksSearch collapsed={false} />
            </div>

            <div className="flex items-center gap-1.5 ml-4">
              {/* Secondary actions */}
              {(
                [
                  { panel: 'lock',    icon: Lock,    label: 'New Lock',    faIcon: null,         permission: 'lock:write' },
                  { panel: 'drift',   icon: null,    label: 'New Drift',   faIcon: faCodeBranch, permission: 'event:write' },
                  { panel: 'rpa',     icon: null,    label: 'New RPA',     faIcon: faRobot,      permission: 'event:write' },
                  { panel: 'service', icon: Package, label: 'New Service', faIcon: null,         permission: 'catalog:write' },
                ] as const
              ).map((item) => {
                const { panel, icon: Icon, label, faIcon, permission } = item
                const className = "flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all duration-150"
                const style = {
                  color: 'rgb(var(--hud-on-surface-var))',
                  border: '1px solid rgb(var(--hud-outline-var))',
                  background: 'rgb(var(--hud-surface))',
                }
                const onMouseEnter = (e: MouseEvent<HTMLElement>) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-surface-high))'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--hud-outline))'
                }
                const onMouseLeave = (e: MouseEvent<HTMLElement>) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-surface))'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--hud-outline-var))'
                }
                return (
                  <Can key={label} perm={permission}>
                    <button type="button" onClick={() => open(panel)} className={className} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                      {faIcon ? <FontAwesomeIcon icon={faIcon} className="w-3 h-3" /> : Icon ? <Icon className="w-3 h-3" /> : null}
                      {label}
                    </button>
                  </Can>
                )
              })}

              {/* Primary CTA */}
              <Can perm="event:write">
                <button
                  type="button"
                  onClick={() => open('event')}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all duration-150 text-white"
                  style={{
                    background: 'rgb(var(--hud-primary))',
                    boxShadow: '0 1px 2px rgb(var(--hud-primary) / 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-primary-dim))'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-primary))'
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Event
                </button>
              </Can>

              <span className="w-px h-5 mx-1" style={{ background: 'rgb(var(--hud-outline-var))' }} />
              <UserMenu />
            </div>
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>

        <Footer isCollapsed={isCollapsed} />
      </div>

      <CreatePanelHost />
    </div>
  )
}
