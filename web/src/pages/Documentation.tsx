import { useState } from 'react'
import { BookOpen, ChevronRight, Search, X } from 'lucide-react'

type Section = {
  id: string
  title: string
  content: string
  subsections?: { id: string; title: string; content: string }[]
}

const sections: Section[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: `Tracker is a comprehensive event management platform designed to monitor and visualize deployments, operations, configuration drifts, and RPA activities across your infrastructure.

Key Features:
• Real-time event tracking across multiple environments
• Overlap detection to identify scheduling conflicts
• Gantt-style visualization for timeline planning
• Jira integration for drift management
• Advanced filtering and search capabilities
• Dark mode support for comfortable viewing`,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `The main navigation bar at the top provides access to all features:

• Dashboard - Overview of today's activity
• EvDropdown menu with 4 views (Timeline, Streamline, Calendar, Overlaps)
• Catalog - Service inventory
• Drifts - Configuration drift tracking
• RPA Usage - Automation monitoring

Click the sun/moon icon in the top-right corner to switch between light and dark modes.`,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    content: 'The Dashboard provides a quick overview of today\'s events and system health.',
    subsections: [
      {
        id: 'statistics',
        title: 'Statistics Cards',
        content: `Five main metrics are displayed:

1. Total Events - All events created today
2. Success - Successfully completed events
3. Failures - Failed or errored events
4. In Progress - Currently running events
5. Overlaps - Number of scheduling conflicts (with alert indicator)`,
      },
      {
        id: 'overlap-alert',
        title: 'Overlap Alert',
        content: `When events overlap, a prominent orange banner appears showing:
• Number of conflicts detected
• List of overlapping event pairs
• Quick access to detailed information`,
      },
      {
        id: 'charts',
        title: 'Event Distribution Charts',
        content: `Visual breakdown by:
• Event Type - Deployments, Operations, Drifts, Incidents
• Status - Success, Failure, In Progress
• Priority - P1 (Critical) to P5 (Low)
• Environment - Development, Production, etc.`,
      },
    ],
  },
  {
    id: 'timeline',
    title: 'Timeline View',
    content: 'Chronological list of all events with advanced filtering.',
    subsections: [
      {
        id: 'timeline-navigation',
        title: 'Time Period Selection',
        content: `Navigate through time using:
• Period selector - Choose 1, 3, 7, 14, 30, 60, or 90 days
• Previous/Next buttons - Move backward or forward
• Today button - Jump back to current period`,
      },
      {
        id: 'timeline-sorting',
        title: 'Sorting',
        content: `Toggle between:
• Newest first (default) - Most recent events at the top
• Oldest first - Historical events first`,
      },
      {
        id: 'timeline-filtering',
        title: 'Filtering',
        content: `Click the Filters button to access:
• Event Type - Deployment, Operation, Drift, Incident
• Environment - Development, Integration, Production, etc.
• Priority - P1 (Critical) to P5 (Low)
• Status - Start, Success, Failure, Error, Done, etc.
• Service - Filter by specific services from the catalog`,
      },
    ],
  },
  {
    id: 'streamline',
    title: 'Streamline View',
    content: 'Gantt-style visualization to identify scheduling conflicts.',
    subsections: [
      {
        id: 'streamline-modes',
        title: 'View Modes',
        content: `Grouping Options:
• By Service - Events grouped by project/service
• By Environment - Events grouped by environment

Time Scale:
• Week View - 7 columns (one per day)
• Day View - 24 columns (one per hour)`,
      },
      {
        id: 'streamline-overlap',
        title: 'Overlap Detection',
        content: `Groups with overlapping events show:
• 🚨 Animated warning icon (pulsing orange triangle)
• Concurrent count - Number of simultaneous events
• Multi-track layout - Events automatically placed on separate tracks`,
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar View',
    content: 'Monthly calendar with daily event overview.',
    subsections: [
      {
        id: 'calendar-grid',
        title: 'Calendar Grid',
        content: `• Current day highlighted in blue
• Selected day highlighted in primary color
• Days with overlaps show a warning icon 🚨

Click any day to view its events in the right panel.`,
      },
      {
        id: 'calendar-overlap',
        title: 'Overlap Detection',
        content: `When a selected day has overlapping events:
• Orange alert banner appears at the top
• List of conflicts with exact time periods
• Event pairs showing which events overlap
• Duration details for each event`,
      },
    ],
  },
  {
    id: 'overlaps',
    title: 'Overlaps View',
    content: 'Dedicated page for managing scheduling conflicts.',
    subsections: [
      {
        id: 'overlaps-stats',
        title: 'Statistics',
        content: `Three key metrics:
• Total Overlaps - Number of conflicts in the period
• Days with Overlaps - How many days are affected
• Services Involved - Number of unique services`,
      },
      {
        id: 'overlaps-details',
        title: 'Conflict Details',
        content: `For each overlap:
• Time period - Exact overlap window (HH:mm - HH:mm)
• Duration - Length of conflict in minutes
• Side-by-side comparison of conflicting events
• Contact information (Owner, Email, Slack channel)`,
      },
      {
        id: 'overlaps-usecase',
        title: 'Use Case',
        content: `Use this page to:
1. Identify scheduling conflicts
2. Contact responsible teams
3. Coordinate deployment windows
4. Avoid production incidents`,
      },
    ],
  },
  {
    id: 'catalog',
    title: 'Catalog',
    content: 'Inventory of all modules, libraries, and projects.',
    subsections: [
      {
        id: 'catalog-search',
        title: 'Search Bar',
        content: `Type to search across:
• Service name
• Description
• Owner name

Clear button (X) appears when text is entered.`,
      },
      {
        id: 'catalog-filters',
        title: 'Quick Filters',
        content: `Type Filters:
• Module, Library, Workflow, Project, Chart, Package, Container

Language Filters:
• Go, Java, Python, PHP, JavaScript, TypeScript, Rust
• Terraform, Helm, Docker, and more...

Click multiple filters to combine them. Clear All button appears when filters are active.`,
      },
    ],
  },
  {
    id: 'drifts',
    title: 'Drifts Management',
    content: 'Track and manage configuration drifts.',
    subsections: [
      {
        id: 'drifts-jira',
        title: 'Jira Integration',
        content: `Adding a Ticket:
1. Click "Add Ticket" button on any drift
2. Modal opens with drift information
3. Click "Open Jira (New Tab)" to create a ticket
4. Copy the ticket URL
5. Paste it in the "Jira Ticket URL" field
6. Click "Save Ticket Link"

Linked tickets appear as clickable links with an external icon.`,
      },
      {
        id: 'drifts-stats',
        title: 'Statistics',
        content: `Three cards showing:
• Total Drifts - All detected drifts
• Unresolved - Drifts not yet fixed
• Resolved - Completed drifts`,
      },
    ],
  },
  {
    id: 'rpa',
    title: 'RPA Usage',
    content: `Monitor Robotic Process Automation activities.

Statistics:
• Total Operations - All RPA operations
• Success - Successful executions
• Failures - Failed operations

Each RPA operation displays type, title, service, environment, status badges, and timestamp.`,
  },
  {
    id: 'locks',
    title: 'Locks Management',
    content: 'Prevent concurrent deployments and operations with service locks.',
    subsections: [
      {
        id: 'locks-overview',
        title: 'Overview',
        content: `Locks allow you to temporarily prevent deployments or operations on specific services and environments. This is useful to:
• Avoid conflicts during maintenance windows
• Coordinate deployments across teams
• Freeze environments during critical periods
• Prevent accidental deployments`,
      },
      {
        id: 'locks-create',
        title: 'Creating a Lock',
        content: `1. Navigate to the Locks page
2. Click "Create Lock" button
3. Fill in the required fields:
   • Service - Name of the service to lock
   • Who - Person or team creating the lock
   • Environment - Target environment (production, staging, etc.)
   • Resource (optional) - Type of resource (deployment, operation)
   • Event ID (optional) - Associated event identifier
4. Click "Create Lock"

The lock is immediately active and will prevent new operations.`,
      },
      {
        id: 'locks-list',
        title: 'Viewing Active Locks',
        content: `The Locks page displays:
• Total number of active locks
• Number of unique services locked
• Number of environments affected

Each lock shows:
• Service name with lock icon
• Environment badge
• Resource type
• Who created the lock
• Creation date and time
• Duration since creation
• Quick unlock button`,
      },
      {
        id: 'locks-unlock',
        title: 'Unlocking a Service',
        content: `To remove a lock:
1. Find the lock in the list
2. Click the "Unlock" button
3. Confirm the action

The service is immediately available for new operations.

You can also unlock from:
• Event details modal (if lock is associated with an event)
• Lock indicator components throughout the UI`,
      },
      {
        id: 'locks-indicators',
        title: 'Lock Indicators',
        content: `When a service is locked, you'll see indicators:
• Red "Locked" badge on events
• Lock icon next to service names
• Warning messages when trying to deploy
• Quick access to unlock or view all locks

These indicators help prevent accidental operations on locked services.`,
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    content: '',
    subsections: [
      {
        id: 'event-modal',
        title: 'Event Details Modal',
        content: `Click any event to open a detailed modal showing:
• Event type icon and badge
• Full title and description
• Service, Source, Environment, Owner
• Priority and Status
• Start and end dates
• All associated links (Slack, GitHub, etc.)
• Event ID and timestamps`,
      },
      {
        id: 'filtering-tips',
        title: 'Filtering Best Practices',
        content: `1. Start broad - View all events first
2. Add filters gradually - Narrow down step by step
3. Use multiple filters - Combine for precise results
4. Check active count - Badge shows how many filters are active
5. Clear when done - Use "Clear All Filters" to reset`,
      },
      {
        id: 'performance',
        title: 'Performance Tips',
        content: `• Use time period filters to limit data
• Apply service filters for faster loading
• Clear filters when not needed
• Refresh page if data seems stale`,
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    content: `Drift - Unintended configuration change detected in infrastructure

Event - Any tracked activity (deployment, operation, incident, etc.)

Overlap - Two or more events running simultaneously

RPA - Robotic Process Automation

Service - Application, module, or system being tracked

Streamline - Gantt-style timeline visualization

P1-P5 - Priority levels (P1 = Critical, P5 = Low)`,
  },
]

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('introduction')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSections = sections.filter(section => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query) ||
      section.subsections?.some(sub =>
        sub.title.toLowerCase().includes(query) ||
        sub.content.toLowerCase().includes(query)
      )
    )
  })

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="card sticky top-8 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Contents</h3>
          </div>
          
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Documentation</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Complete guide to using Tracker
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Documentation Content */}
        <div className="space-y-8">
          {filteredSections.map(section => (
            <div key={section.id} id={section.id} className="card scroll-mt-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <ChevronRight className="w-6 h-6 text-primary-600" />
                <span>{section.title}</span>
              </h2>
              
              {section.content && (
                <div className="prose dark:prose-invert max-w-none mb-6">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              )}

              {section.subsections && (
                <div className="space-y-6 mt-6">
                  {section.subsections.map(subsection => (
                    <div key={subsection.id} id={subsection.id} className="pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {subsection.title}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {subsection.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No results found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

