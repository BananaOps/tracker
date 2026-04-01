import { Outlet, Link, useLocation } from 'react-router-dom'
import { Calendar, Clock, Table, GitBranch, Bot, LayoutDashboard, Rocket, Package, AlertTriangle, BookOpen, MessageSquare, Lock, BarChart3, ChevronLeft, ChevronRight, Link as LinkIcon, Plus } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import OpenSourceBanner from './OpenSourceBanner'
import StaticModeBanner from './StaticModeBanner'
import DemoBanner from './DemoBanner'
import Footer from './Footer'
import LinksSearch from './LinksSearch'
import { getSlackEventsChannelUrl } from '../config'

const navigationSections = [
  {
    label: 'Operations',
    items: [
      { name: 'Dashboard',   href: '/dashboard',         icon: LayoutDashboard },
      { name: 'Timeline',    href: '/events/timeline',   icon: Clock },
      { name: 'Streamline',  href: '/events/streamline', icon: Package },
      { name: 'Calendar',    href: '/events/calendar',   icon: Calendar },
      { name: 'Overlaps',    href: '/events/overlaps',   icon: AlertTriangle },
      { name: 'Insights',    href: '/insights',          icon: BarChart3 },
    ],
  },
  {
    label: 'Services',
    items: [
      { name: 'Catalog',      href: '/catalog',                    icon: Table },
      { name: 'Architecture', href: '/catalog/dependencies',       icon: ({ className }: { className?: string }) => <span className={`inline-flex items-center justify-center ${className || ''}`}><i className="fa-solid fa-chart-diagram text-[13px]" /></span> },
      { name: 'Compliance',   href: '/catalog/version-compliance', icon: AlertTriangle },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'Drifts',    href: '/drifts', icon: GitBranch },
      { name: 'RPA Usage', href: '/rpa',    icon: Bot },
      { name: 'Locks',     href: '/locks',  icon: Lock },
    ],
  },
  {
    label: 'Resources',
    items: [
      { name: 'Links', href: '/links', icon: LinkIcon },
      { name: 'Docs',  href: '/docs',  icon: BookOpen },
    ],
  },
]

export default function Layout() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActiveRoute = (href: string) => location.pathname === href

  const navItem = 'flex items-center px-3 py-[7px] rounded-ig text-sm font-medium transition-all duration-150 cursor-pointer select-none'
  const navActive = 'bg-[rgb(var(--hud-sidebar-active))] text-[rgb(var(--hud-sidebar-text-active))] font-semibold'
  const navInactive = 'text-[rgb(var(--hud-sidebar-text))] hover:bg-hud-surface-high hover:text-hud-on-surface'

  return (
    <div className="min-h-screen bg-hud-bg">
      <div>
        <DemoBanner />
        <OpenSourceBanner />
        <StaticModeBanner />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${isCollapsed ? 'w-[56px]' : 'w-[220px]'} flex flex-col fixed h-screen z-40 transition-all duration-200`}
          style={{
            background: 'rgb(var(--hud-sidebar-bg))',
            borderRight: '1px solid rgb(var(--hud-sidebar-border))',
          }}
        >
          {/* Logo */}
          <div
            className={`flex items-center h-[52px] px-4 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}
            style={{ borderBottom: '1px solid rgb(var(--hud-sidebar-border))' }}
          >
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-ig flex items-center justify-center shrink-0"
                style={{ background: 'rgb(var(--hud-primary))' }}
              >
                <Rocket className="w-4 h-4 text-white" style={{ transform: 'rotate(-45deg)' }} />
              </div>
              {!isCollapsed && (
                <span className="text-[15px] font-bold text-hud-on-surface tracking-tight truncate">
                  Tracker
                </span>
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
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
            {navigationSections.map((section) => (
              <div key={section.label}>
                {!isCollapsed && (
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-hud-on-surface-var/50 select-none">
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
                        <Icon className={`w-[15px] h-[15px] shrink-0 ${isCollapsed ? '' : 'mr-2.5'}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div
            className="px-2 py-3 space-y-1"
            style={{ borderTop: '1px solid rgb(var(--hud-sidebar-border))' }}
          >
            {getSlackEventsChannelUrl() && (
              <a
                href={getSlackEventsChannelUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className={`${navItem} ${isCollapsed ? 'justify-center' : ''} ${navInactive}`}
                title={isCollapsed ? 'Events Channel' : ''}
              >
                <MessageSquare className={`w-[15px] h-[15px] shrink-0 ${isCollapsed ? '' : 'mr-2.5'}`} />
                {!isCollapsed && <span className="truncate">Events Channel</span>}
              </a>
            )}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'px-1'}`}>
              <ThemeToggle compact={isCollapsed} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`flex-1 ${isCollapsed ? 'ml-[56px]' : 'ml-[220px]'} flex flex-col h-screen overflow-hidden transition-all duration-200`}>
          {/* Top Bar */}
          <header
            className="h-[52px] shrink-0 flex items-center justify-between px-5 relative z-50"
            style={{
              background: 'rgb(var(--hud-surface))',
              borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.5)',
            }}
          >
            <div className="flex-1 max-w-xl">
              <LinksSearch collapsed={false} />
            </div>

            <div className="flex items-center gap-1.5 ml-4">
              {/* Secondary actions */}
              {(
                [
                  { to: '/locks/create',   icon: Lock,    label: 'New Lock' },
                  { to: '/drifts/create',  icon: null,    label: 'New Drift',    faIcon: faCodeBranch },
                  { to: '/rpa/create',     icon: null,    label: 'New RPA',      faIcon: faRobot },
                  { to: '/catalog/create', icon: Package, label: 'New Service' },
                ] as const
              ).map(({ to, icon: Icon, label, faIcon }: any) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all duration-150"
                  style={{
                    color: 'rgb(var(--hud-on-surface-var))',
                    border: '1px solid rgb(var(--hud-outline-var))',
                    background: 'rgb(var(--hud-surface))',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-surface-high))'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--hud-outline))'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgb(var(--hud-surface))'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--hud-outline-var))'
                  }}
                >
                  {faIcon
                    ? <FontAwesomeIcon icon={faIcon} className="w-3 h-3" />
                    : <Icon className="w-3 h-3" />
                  }
                  {label}
                </Link>
              ))}

              {/* Primary CTA */}
              <Link
                to="/events/create"
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
              </Link>
            </div>
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>

        <Footer isCollapsed={isCollapsed} />
      </div>
    </div>
  )
}
