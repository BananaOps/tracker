import { Outlet, Link, useLocation } from 'react-router-dom'
import { Calendar, Clock, Plus, Table, TrendingDown, Activity, LayoutDashboard } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Timeline', href: '/events/timeline', icon: Clock },
  { name: 'Calendrier', href: '/events/calendar', icon: Calendar },
  { name: 'Créer Event', href: '/events/create', icon: Plus },
  { name: 'Catalog', href: '/catalog', icon: Table },
  { name: 'Drifts', href: '/drifts', icon: TrendingDown },
  { name: 'RPA Usage', href: '/rpa', icon: Activity },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">Tracker</h1>
              </div>
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
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
