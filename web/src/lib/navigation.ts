import type { IconName } from '@/components/ui/icons'

export interface NavEntry {
  name: string
  icon: IconName
  to: string
  /** Time views share their filters and period (useTimeQuery). */
  timeView?: boolean
}

export interface NavSection {
  label: string
  items: NavEntry[]
}

/** The four navigation groups of the brand book. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'operations',
    items: [
      { name: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
      { name: 'Timeline', icon: 'timeline', to: '/events/timeline', timeView: true },
      { name: 'Streamline', icon: 'streamline', to: '/events/streamline', timeView: true },
      { name: 'Calendar', icon: 'calendar', to: '/events/calendar', timeView: true },
      { name: 'Overlaps', icon: 'overlaps', to: '/events/overlaps' },
      { name: 'Insights', icon: 'insights', to: '/insights' },
    ],
  },
  {
    label: 'services',
    items: [
      { name: 'Catalog', icon: 'catalog', to: '/catalog' },
      { name: 'Architecture', icon: 'architecture', to: '/catalog/dependencies' },
      { name: 'Compliance', icon: 'compliance', to: '/catalog/version-compliance' },
    ],
  },
  {
    label: 'infrastructure',
    items: [
      { name: 'Drifts', icon: 'drifts', to: '/drifts' },
      { name: 'RPA usage', icon: 'rpa', to: '/rpa' },
      { name: 'Locks', icon: 'locks', to: '/locks' },
    ],
  },
  {
    label: 'resources',
    items: [
      { name: 'Links', icon: 'links', to: '/links' },
      { name: 'Docs', icon: 'docs', to: '/documentation' },
    ],
  },
]

/**
 * The navigation entry of a path: the longest entry path it starts with, on a segment
 * boundary (/catalog/dependencies is Architecture, /catalog/checkout is Catalog).
 */
export function activeNavName(pathname: string, sections: NavSection[] = NAV_SECTIONS): string | undefined {
  let best: NavEntry | undefined
  for (const item of sections.flatMap((s) => s.items)) {
    const hit = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (hit && (!best || item.to.length > best.to.length)) best = item
  }
  return best?.name
}
