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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Timeline', href: '/events/timeline', icon: Clock },
  { name: 'Streamline', href: '/events/streamline', icon: Package },
  { name: 'Calendar', href: '/events/calendar', icon: Calendar },
  { name: 'Overlaps', href: '/events/overlaps', icon: AlertTriangle },
  { name: 'Insights', href: '/insights', icon: BarChart3 },
  { name: 'Services', href: '/catalog', icon: Table },
  { name: 'Architecture Diagram', href: '/catalog/dependencies', icon: ({ className }: { className?: string }) => <span className={`inline-flex items-center justify-center ${className || ''}`}><i className="fa-solid fa-chart-diagram text-sm" /></span> },
  { name: 'Version Compliance', href: '/catalog/version-compliance', icon: AlertTriangle },
  { name: 'Drifts', href: '/drifts', icon: GitBranch },
  { name: 'RPA Usage', href: '/rpa', icon: Bot },
  { name: 'Locks', href: '/locks', icon: Lock },
  { name: 'Links', href: '/links', icon: LinkIcon },
  { name: 'Docs', href: '/docs', icon: BookOpen },
]

export default function Layout() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActiveRoute = (href: string) => location.pathname === href

  // Shared classes
  const navItem = 'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200'
  const navActive = 'bg-hud-primary/10 text-hud-primary border-l-2 border-hud-primary'
  const navInactive = 'text-hud-on-surface-var hover:bg-hud-surface-high hover:text-hud-on-surface'

  return (
    <div className="min-h-screen bg-hud-bg">
      <div>
        <DemoBanner />
        <OpenSourceBanner />
        <StaticModeBanner />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[rgb(var(--hud-sidebar-bg))] border-r border-[rgb(var(--hud-sidebar-border)/0.3)] flex flex-col fixed h-screen z-40 transition-all duration-300`}>
          {/* Logo */}
          <div className="p-4 border-b border-[rgb(var(--hud-sidebar-border)/0.3)] flex items-center justify-between">
            <Link to="/dashboard" className={`flex items-center group ${isCollapsed ? 'mx-auto' : ''}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-hud-primary to-hud-primary-dim rounded-lg transform group-hover:scale-110 transition-transform duration-200" />
                <div className="relative p-1.5">
                  <Rocket className="w-5 h-5 text-white transform -rotate-45" />
                </div>
              </div>
              {!isCollapsed && (
                <h1 className="ml-2 text-xl font-bold font-grotesk text-hud-primary">
                  Tracker
                </h1>
              )}
            </Link>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-hud-surface border border-hud-outline-var/30 rounded-full p-1 hover:bg-hud-surface-high transition-colors z-50"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4 text-hud-on-surface-var" />
              : <ChevronLeft className="w-4 h-4 text-hud-on-surface-var" />
            }
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)

                return (
                  <Link key={item.name} to={item.href}
                    className={`${navItem} ${isCollapsed ? 'justify-center' : ''} ${isActive ? navActive : navInactive}`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-[rgb(var(--hud-sidebar-border)/0.3)] space-y-2">
            {getSlackEventsChannelUrl() && (
              <a href={getSlackEventsChannelUrl()!} target="_blank" rel="noopener noreferrer"
                className={`${navItem} ${isCollapsed ? 'justify-center' : ''} ${navInactive}`}
                title={isCollapsed ? 'Open Events Channel in Slack' : ''}
              >
                <MessageSquare className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && 'Events Channel'}
              </a>
            )}
            <div className="flex justify-center">
              <ThemeToggle compact={isCollapsed} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} flex flex-col h-screen overflow-hidden transition-all duration-300`}>
          {/* Top Bar */}
          <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b relative z-50" style={{ background: 'rgb(var(--hud-surface) / 0.6)', backdropFilter: 'blur(12px)', borderColor: 'rgb(var(--hud-outline-var) / 0.15)' }}>
            <div className="flex-1 max-w-2xl">
              <LinksSearch collapsed={false} />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Link to="/locks/create"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}
              >
                <Lock className="w-3.5 h-3.5" /> New Lock
              </Link>
              <Link to="/drifts/create"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}
              >
                <FontAwesomeIcon icon={faCodeBranch} className="w-3.5 h-3.5" /> New Drift
              </Link>
              <Link to="/rpa/create"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}
              >
                <FontAwesomeIcon icon={faRobot} className="w-3.5 h-3.5" /> New RPA
              </Link>
              <Link to="/catalog/create"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}
              >
                <Package className="w-3.5 h-3.5" /> New Service
              </Link>
              <Link to="/events/create"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'rgb(var(--hud-primary))', color: 'white', boxShadow: '0 2px 8px rgb(var(--hud-primary) / 0.2)' }}
              >
                <Plus className="w-4 h-4" /> New Event
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
