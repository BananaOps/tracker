import { Outlet, Link, useLocation } from 'react-router-dom'
import { Calendar, Clock, Table, GitBranch, Bot, LayoutDashboard, Rocket, Package, AlertTriangle, ChevronDown, BookOpen, MessageSquare, Lock, BarChart3 } from 'lucide-react'
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
  { name: 'Catalog', href: '/catalog', icon: Table },
  { name: 'Drifts', href: '/drifts', icon: GitBranch },
  { name: 'RPA Usage', href: '/rpa', icon: Bot },
  { name: 'Locks', href: '/locks', icon: Lock },
  { name: 'Docs', href: '/docs', icon: BookOpen },
]

export default function Layout() {
  const location = useLocation()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <DemoBanner />
      <OpenSourceBanner />
      <StaticModeBanner />
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link to="/dashboard" className="flex-shrink-0 flex items-center group">
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

              {/* Navigation horizontale */}
              <div className="hidden md:flex items-center space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveRoute(item.href, item.submenu)
                  const hasSubmenu = !!item.submenu

                  if (hasSubmenu) {
                    return (
                      <div 
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => handleMouseEnter(item.name)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <button
                          className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-1.5" />
                          {item.name}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </button>

                        {/* Dropdown menu */}
                        {openSubmenu === item.name && (
                          <div 
                            className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                            onMouseEnter={() => handleMouseEnter(item.name)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {item.submenu?.map((subItem) => {
                              const SubIcon = subItem.icon
                              const isSubActive = location.pathname === subItem.href
                              return (
                                <Link
                                  key={subItem.name}
                                  to={subItem.href}
                                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                    isSubActive
                                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <SubIcon className="w-4 h-4 mr-2" />
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
                      className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Actions à droite */}
            <div className="flex items-center space-x-3">
              {/* Slack Events Channel Link */}
              {getSlackEventsChannelUrl() && (
                <a
                  href={getSlackEventsChannelUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Open Events Channel in Slack"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden md:inline">Events Channel</span>
                </a>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
