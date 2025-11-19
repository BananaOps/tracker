import { Outlet, Link, useLocation } from 'react-router-dom'
import { Calendar, Clock, Plus, Table, GitBranch, Bot, LayoutDashboard, Rocket } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import OpenSourceBanner from './OpenSourceBanner'
import Footer from './Footer'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Timeline', href: '/events/timeline', icon: Clock },
  { name: 'Calendar', href: '/events/calendar', icon: Calendar },
  { name: 'Catalog', href: '/catalog', icon: Table },
  { name: 'Drifts', href: '/drifts', icon: GitBranch },
  { name: 'RPA Usage', href: '/rpa', icon: Bot },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <OpenSourceBanner />
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center group">
                <div className="relative">
                  {/* Cercle de fond avec gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg transform group-hover:scale-110 transition-transform duration-200"></div>
                  {/* Icône fusée */}
                  <div className="relative p-2">
                    <Rocket className="w-6 h-6 text-white transform -rotate-45" />
                  </div>
                </div>
                {/* Texte Tracker */}
                <h1 className="ml-3 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Tracker
                </h1>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900 dark:text-gray-100'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center">
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
