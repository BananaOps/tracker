import { Outlet, Link, useLocation } from 'react-router-dom'
import { Calendar, Clock, Table, GitBranch, Bot, LayoutDashboard, Rocket, Package, AlertTriangle, ChevronDown, BookOpen, MessageSquare, Lock, BarChart3, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'
import OpenSourceBanner from './OpenSourceBanner'
import StaticModeBanner from './StaticModeBanner'
import DemoBanner from './DemoBanner'
import Footer from './Footer'
import { getSlackEventsChannelUrl } from '../config'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'Events', 
    icon: Clock,
    submenu: [
      { name: 'Timeline', href: '/events/timeline', icon: Clock },
      { name: 'Streamline', href: '/events/streamline', icon: Package },
      { name: 'Calendar', href: '/events/calendar', icon: Calendar },
      { name: 'Overlaps', href: '/events/overlaps', icon: AlertTriangle },
    ]
  },
  { name: 'Insights', href: '/insights', icon: BarChart3 },
  { 
    name: 'Catalog', 
    icon: Table,
    submenu: [
      { name: 'Services', href: '/catalog', icon: Table },
      { name: 'Dependencies', href: '/catalog/dependencies', icon: GitBranch },
      { name: 'Version Compliance', href: '/catalog/version-compliance', icon: AlertTriangle },
    ]
  },
  {
    name: 'Drifts', 
    icon: GitBranch,
    submenu: [
      { name: 'Active Drifts', href: '/drifts', icon: GitBranch },
      { name: 'All Drifts', href: '/drifts/all', icon: Search },
    ]
  },
  { name: 'RPA Usage', href: '/rpa', icon: Bot },
  { name: 'Locks', href: '/locks', icon: Lock },
  { name: 'Docs', href: '/docs', icon: BookOpen },
]

export default function Layout() {
  const location = useLocation()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActiveRoute = (href?: string, submenu?: any[]) => {
    if (href) {
      return location.pathname === href
    }
    if (submenu) {
      return submenu.some(item => location.pathname === item.href)
    }
    return false
  }

  const handleMouseEnter = (itemName: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setOpenSubmenu(itemName)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenSubmenu(null)
    }, 300) // Délai de 300ms avant fermeture
    setHoverTimeout(timeout)
  }

  // Nettoyage du timeout au démontage du composant
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [hoverTimeout])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banners at the top - not fixed, naturally inserted */}
      <div>
        <DemoBanner />
        <OpenSourceBanner />
        <StaticModeBanner />
      </div>
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed h-screen z-40 transition-all duration-300`}>
          {/* Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg transform group-hover:scale-110 transition-transform duration-200"></div>
                <div className="relative p-1.5">
                  <Rocket className="w-5 h-5 text-white transform -rotate-45" />
                </div>
              </div>
              <h1 className="ml-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                Tracker
              </h1>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/dashboard" className="flex items-center group mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg transform group-hover:scale-110 transition-transform duration-200"></div>
                <div className="relative p-1.5">
                  <Rocket className="w-5 h-5 text-white transform -rotate-45" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-50"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href, item.submenu)
              const hasSubmenu = !!item.submenu
              const isOpen = openSubmenu === item.name

              if (hasSubmenu) {
                // En mode collapsed, on redirige vers la première page du submenu
                const firstSubmenuItem = item.submenu?.[0]
                
                if (isCollapsed && firstSubmenuItem) {
                  return (
                    <Link
                      key={item.name}
                      to={firstSubmenuItem.href}
                      className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={item.name}
                    >
                      <Icon className="w-4 h-4" />
                    </Link>
                  )
                }
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setOpenSubmenu(isOpen ? null : item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Submenu */}
                    {isOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu?.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isSubActive = location.pathname === subItem.href
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                                isSubActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <SubIcon className="w-4 h-4 mr-3" />
                              {subItem.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <Icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {getSlackEventsChannelUrl() && (
            <a
              href={getSlackEventsChannelUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
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
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} flex flex-col min-h-screen transition-all duration-300`}>
        <main className="flex-1 pb-12">
          <Outlet />
        </main>
      </div>
      
      {/* Fixed Footer */}
      <Footer isCollapsed={isCollapsed} />
      </div>
    </div>
  )
}
