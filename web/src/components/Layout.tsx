import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import ThemeToggle from './ThemeToggle'
import OpenSourceBanner from './OpenSourceBanner'
import StaticModeBanner from './StaticModeBanner'
import DemoBanner from './DemoBanner'
import Footer from './Footer'
import CreatePanelHost from './CreatePanelHost'
import { NewMenu } from './shell/NewMenu'
import { ShellPalette } from './shell/ShellPalette'
import { Icon } from './ui/icon'
import { Kbd } from './ui/kbd'
import { Sidebar, type NavGroup } from './ui/sidebar'
import { useTimeQueryMemory } from '../contexts/timeQuery'
import { useNavCounts } from '../hooks/useNavCounts'
import { useShortcuts } from '../hooks/useShortcuts'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed'
import { activeNavName, NAV_SECTIONS } from '../lib/navigation'
import { getSlackEventsChannelUrl } from '../config'

// Shown while a page chunk downloads.
function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading page">
      <span className="font-mono text-[11px] text-muted">loading…</span>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const [collapsed, toggleCollapsed] = useSidebarCollapsed(location.pathname)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { remembered } = useTimeQueryMemory()
  const counts = useNavCounts()
  const bannersRef = useRef<HTMLDivElement>(null)
  const [bannersHeight, setBannersHeight] = useState(0)

  useShortcuts({ onPalette: () => setPaletteOpen(true) })

  // Measure the banners, whose height changes when one is dismissed.
  useEffect(() => {
    const el = bannersRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setBannersHeight(el.offsetHeight))
    observer.observe(el)
    setBannersHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

  // Time views carry the filters and period the user last had.
  const groups = useMemo<NavGroup[]>(
    () =>
      NAV_SECTIONS.map((section) => ({
        label: section.label,
        items: section.items.map((item) => ({
          name: item.name,
          icon: item.icon,
          to: item.timeView && remembered ? `${item.to}?${remembered}` : item.to,
          count: counts[item.name],
        })),
      })),
    [remembered, counts],
  )

  const slackUrl = getSlackEventsChannelUrl()

  return (
    <div className="min-h-screen bg-paper">
      <div ref={bannersRef} className="fixed top-0 right-0 left-0 z-50">
        <DemoBanner />
        <OpenSourceBanner />
        <StaticModeBanner />
      </div>
      <div className="flex">
        <Sidebar
          groups={groups}
          active={activeNavName(location.pathname)}
          homeTo="/dashboard"
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          className="fixed z-40 transition-[width] duration-[180ms] ease-ds"
          footer={
            <>
              {slackUrl && (
                <a
                  href={slackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={collapsed ? 'Events channel' : undefined}
                  title={collapsed ? 'Events channel' : undefined}
                  className="flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-[14px] text-ink no-underline hover:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <Icon name="links" className="text-muted" />
                  {!collapsed && <span>Events channel</span>}
                </a>
              )}
              <ThemeToggle compact={collapsed} />
            </>
          }
          style={{ top: bannersHeight, height: `calc(100vh - ${bannersHeight}px)` }}
        />
        <div
          className={`flex h-screen flex-1 flex-col overflow-hidden transition-[margin] duration-[180ms] ease-ds ${collapsed ? 'ml-[60px]' : 'ml-sidebar-w'}`}
          style={{ paddingTop: bannersHeight }}
        >
          <header className="relative z-30 flex min-h-[60px] shrink-0 flex-wrap items-center justify-between gap-space-3 border-b border-rule bg-surface px-space-8 py-2.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="box-border flex h-control-md max-w-[420px] flex-[0_1_420px] cursor-pointer items-center gap-space-2 rounded-md border border-rule-strong bg-paper px-2.5 text-left text-[14px] text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <Icon name="search" />
              <span className="flex-1">Search or jump to…</span>
              <Kbd>⌘K</Kbd>
            </button>
            <NewMenu />
          </header>
          <main className="flex flex-1 flex-col overflow-hidden">
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <Footer isCollapsed={collapsed} />
      </div>
      <ShellPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <CreatePanelHost />
    </div>
  )
}
