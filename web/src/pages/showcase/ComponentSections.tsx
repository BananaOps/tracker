import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { CommandPalette, type PaletteGroup } from '../../components/ui/command-palette'
import { EventDrawer } from '../../components/ui/event-drawer'
import { EventList, type Density, type EventRowData } from '../../components/ui/event-row'
import { Highlight } from '../../components/ui/highlight'
import { Icon } from '../../components/ui/icon'
import { iconNames } from '../../components/ui/icons'
import { ImpactMark } from '../../components/ui/impact-mark'
import { Kbd } from '../../components/ui/kbd'
import { Logo } from '../../components/ui/logo'
import { MetricStrip, type Metric } from '../../components/ui/metric-strip'
import { QueryBar, QueryEmptyState } from '../../components/ui/query-bar'
import { SavedViews } from '../../components/ui/saved-views'
import { SegmentedControl } from '../../components/ui/segmented-control'
import { Sidebar, type NavGroup } from '../../components/ui/sidebar'
import { StatusMark } from '../../components/ui/status-mark'
import { TimeRuler } from '../../components/ui/time-ruler'
import type { DrawerEvent } from '../../lib/event-drawer'
import { parseQuery, serializeQuery, type Query } from '../../lib/query'
import { currentView, DEFAULT_VIEWS } from '../../lib/saved-views'
import { Environment, EventType, Priority, Status, type Event } from '../../types/api'
import { DS_STATUSES } from '../../lib/status'
import { Example, Section, ThemeColumns } from './layout'

// Sample data, as in the mockups. Pages use the API.

const EVENTS: EventRowData[] = [
  { id: '1', time: '15:04', status: 'failed', title: 'Deploy monitoring v2.5.5 → mco', impact: true, meta: ['deployment', 'mco', 'P3', 'infra-team'] },
  { id: '2', time: '14:52', status: 'running', title: 'Rotate TLS certificates', meta: ['operation', 'production', 'P2', 'platform-team'] },
  { id: '3', time: '14:10', status: 'warning', title: 'Terraform drift — firewall', meta: ['drift', 'pré-production', 'P2', 'network-team'] },
  { id: '4', time: '13:31', status: 'done', title: 'Deploy payment-service v4.12.0 → production', impact: true, meta: ['deployment', 'production', 'P1', 'payments'] },
  { id: '5', time: '12:00', status: 'open', title: 'Database maintenance window', meta: ['operation', 'production', 'P3', 'data-team'] },
]

const METRICS: Metric[] = [
  { label: 'events / 24h', value: '236' },
  { label: 'failed', value: '2', tone: 'failed', sub: '3 of 5 finished' },
  { label: 'users impacted', value: '1', tone: 'impact' },
  { label: 'failure rate', value: '4.1%', delta: '−3.2 pts vs prev.', trend: 'better' },
  { label: 'time to recover', value: '42 min', delta: '+7 min vs prev.', trend: 'worse' },
]

const NAV: NavGroup[] = [
  {
    label: 'operations',
    items: [
      { name: 'Dashboard', icon: 'dashboard', to: '/theme-test' },
      { name: 'Timeline', icon: 'timeline', to: '/theme-test' },
      { name: 'Streamline', icon: 'streamline', to: '/theme-test' },
    ],
  },
  { label: 'services', items: [{ name: 'Catalog', icon: 'catalog', to: '/theme-test' }] },
  {
    label: 'infrastructure',
    items: [
      { name: 'Drifts', icon: 'drifts', to: '/theme-test', count: 4 },
      { name: 'Locks', icon: 'locks', to: '/theme-test', count: 2 },
    ],
  },
  { label: 'resources', items: [{ name: 'Docs', icon: 'docs', to: '/theme-test' }] },
]

const DRAWER_EVENT: DrawerEvent = {
  status: 'failed',
  time: '15:04:12',
  title: 'Deploy monitoring v2.5.5 → mco',
  type: 'deployment',
  priority: 'P3',
  service: 'monitoring',
  environment: 'mco',
  owner: 'infra-team',
  stakeholders: ['sre', 'payments'],
  impact: true,
  impactNote: '#ops notified · status page updated',
  pullRequest: { label: '#1287', href: 'https://github.com/BananaOps/tracker/pull/1287' },
  ticket: null,
  summary: 'Rolls out the new alert rules. The rollout stopped on the second replica.',
  fields: [
    ['source', 'github-actions'],
    ['start', '07 apr 2026 15:04:12'],
    ['notifications', '#ops'],
  ],
  history: [
    { time: '15:04', status: 'open', text: 'Created by ci' },
    { time: '15:05', status: 'running', text: 'Status start → in_progress by ci' },
    { time: '15:10', status: 'failed', text: 'Status in_progress → failure by ci' },
  ],
}

const PALETTE: PaletteGroup[] = [
  {
    label: 'Jump to',
    items: [
      { label: 'Dashboard', icon: 'dashboard' },
      { label: 'Timeline', icon: 'timeline' },
      { label: 'Streamline', icon: 'streamline' },
    ],
  },
  {
    label: 'Create',
    items: [
      { label: 'New event', icon: 'plus', kbd: 'E' },
      { label: 'New lock', icon: 'locks', kbd: 'L' },
      { label: 'New drift', icon: 'drifts', kbd: 'D' },
    ],
  },
  { label: 'Events', items: [{ id: 'ev-1', label: 'Deploy monitoring v2.5.5 → mco', icon: 'deployment', hint: 'failed · 15:04' }] },
]

function apiEvent(title: string, a: Partial<Event['attributes']>): Event {
  return {
    title,
    attributes: { message: '', source: 'showcase', type: EventType.DEPLOYMENT, priority: Priority.P3, service: 'checkout', status: Status.SUCCESS, environment: Environment.PRODUCTION, ...a },
  }
}

const API_EVENTS: Event[] = [
  apiEvent('Deploy checkout v4.0.0 → production', { status: Status.FAILURE, impact: true, owner: 'payments-team' }),
  apiEvent('Schema migration on orders-db', { service: 'orders-db', type: EventType.OPERATION, status: Status.IN_PROGRESS, owner: 'data-team' }),
  apiEvent('Terraform drift — firewall', { service: 'network', type: EventType.DRIFT, status: Status.WARNING, environment: Environment.PREPRODUCTION, owner: 'network-team' }),
  apiEvent('Deploy orders-db v2.1.0 → mco', { service: 'orders-db', environment: Environment.MCO, owner: 'data-team' }),
]

function QueryDemo() {
  const [query, setQuery] = useState<Query>(parseQuery('env:production,mco -status:done'))
  const q = serializeQuery(query)
  return (
    <div className="flex flex-col gap-space-3">
      <SavedViews views={DEFAULT_VIEWS} currentId={currentView(DEFAULT_VIEWS, q)?.id} counts={{ all: 4, impact: 1, 'production-deploys': 1 }} onSelect={(v) => setQuery(parseQuery(v.q))} onSave={() => {}} />
      <QueryBar query={query} onChange={setQuery} events={API_EVENTS} label="Filter sample events" />
      <QueryEmptyState query={parseQuery('service:orders-db status:failed')} events={API_EVENTS} onChange={() => {}} />
    </div>
  )
}

function EventListDemo() {
  const [density, setDensity] = useState<Density>('comfortable')
  const [selected, setSelected] = useState<string | undefined>('2')
  return (
    <div className="flex flex-col gap-space-3">
      <SegmentedControl label="Density" options={['comfortable', 'compact']} value={density} onChange={(v) => setDensity(v as Density)} />
      <div className="rounded-md border border-rule bg-surface">
        <EventList label="Sample events" events={EVENTS} density={density} selectedId={selected} onSelect={(e) => setSelected(e.id)} />
      </div>
    </div>
  )
}

function SidebarDemo() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-[460px] gap-space-3 overflow-hidden rounded-md border border-rule">
      <Sidebar groups={NAV} active="Timeline" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} homeTo="/theme-test" />
      <Sidebar groups={NAV} active="Drifts" collapsed homeTo="/theme-test" />
    </div>
  )
}

function PaletteDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" icon="search" onClick={() => setOpen(true)}>
        Search or jump to… <Kbd>⌘K</Kbd>
      </Button>
      <CommandPalette open={open} onOpenChange={setOpen} groups={PALETTE} />
    </>
  )
}

/** The lot 2 components, each in its states, light and dark. */
export function ComponentSections() {
  return (
    <>
      <Section id="ds-icon" title="Icon and logo" description="Instrument shapes on a 16 px grid. Muted at rest, ink on hover.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-5">
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-space-2">
                {iconNames.map((name) => (
                  <li key={name} className="flex items-center gap-space-2 text-muted hover:text-ink">
                    <Icon name={name} />
                    <span className="truncate text-data-sm">{name}</span>
                  </li>
                ))}
              </ul>
              <Example label="logo · 24 · symbol 28 · symbol 16">
                <Logo />
                <Logo word={false} size={28} />
                <Logo word={false} size={16} />
              </Example>
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-button" title="Button, Kbd and Highlight" description="One primary per zone. Signature is never a button colour.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-4">
              <Example label="md">
                <Button variant="primary" iconRight="chevron-down">New</Button>
                <Button variant="secondary" icon="locks">Lock service</Button>
                <Button variant="ghost" icon="copy">Copy link</Button>
                <Button variant="ghost" icon="close" aria-label="Close" />
              </Example>
              <Example label="sm">
                <Button variant="primary" size="sm">Edit event</Button>
                <Button variant="secondary" size="sm" icon="filter">Filter</Button>
                <Button variant="ghost" size="sm" icon="plus">Filter</Button>
                <Button variant="ghost" size="sm" icon="close" aria-label="Close" />
              </Example>
              <Example label="disabled · with a key">
                <Button variant="primary" disabled>Save</Button>
                <Button variant="secondary" disabled>Export</Button>
                <Button variant="primary">Search <Kbd>⌘K</Kbd></Button>
              </Example>
              <Example label="kbd · highlight">
                <Kbd>⌘K</Kbd>
                <Kbd>esc</Kbd>
                <span className="text-body">
                  1 deployment <Highlight>is running</Highlight> on production.
                </span>
                <Highlight data>running</Highlight>
                <Highlight data>now 15:31</Highlight>
              </Example>
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-status" title="StatusMark and ImpactMark" description="Only failed and warning carry a status colour; impact is magenta whatever the status.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-4">
              <Example label="tag">
                {DS_STATUSES.map((s) => (
                  <StatusMark key={s} status={s} />
                ))}
              </Example>
              <Example label="glyph alone · 14 px">
                {DS_STATUSES.map((s) => (
                  <StatusMark key={s} status={s} label={false} />
                ))}
              </Example>
              <Example label="impact · compact and labelled">
                <ImpactMark compact />
                <ImpactMark />
                <ImpactMark text="users impacted" />
              </Example>
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-metrics" title="SegmentedControl and MetricStrip" description="Only a worse trend takes a colour; a success rate stays neutral.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-4">
              <Example label="segmented control">
                <SegmentedControl label="Period" options={['24h', '7d', '30d']} defaultValue="7d" />
              </Example>
              <MetricStrip label="Last 24 hours" items={METRICS} />
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-events" title="EventList and TimeRuler" description="Statuses line up on the right edge. ↑ ↓ move the selection.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-4">
              <TimeRuler
                startHour={12}
                endHour={18}
                now="15:31"
                marks={[
                  { at: '12:00', status: 'open' },
                  { at: '13:31', status: 'done' },
                  { at: '14:10', status: 'warning' },
                  { at: '14:52', status: 'running' },
                  { at: '15:04', status: 'failed' },
                ]}
              />
              <EventListDemo />
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-query" title="QueryBar and saved views" description="key:value, key:a,b, -key:value, quoted phrases and free text. / focuses the filter of the page.">
        <ThemeColumns>{() => <QueryDemo />}</ThemeColumns>
      </Section>

      <Section id="ds-nav" title="Sidebar" description="The active page in signature. The rail is 60 px wide.">
        <ThemeColumns>{() => <SidebarDemo />}</ThemeColumns>
      </Section>

      <Section id="ds-drawer" title="EventDrawer" description="The facts people act on in the header, the impact band, details and history.">
        <ThemeColumns>
          {() => (
            <div className="flex justify-end overflow-hidden rounded-md border border-rule">
              <EventDrawer
                event={DRAWER_EVENT}
                onClose={() => {}}
                onFilter={() => {}}
                onLinkTicket={() => {}}
                className="motion-safe:animate-none"
                actions={
                  <>
                    <Button variant="ghost" icon="copy">Copy link</Button>
                    <Button variant="secondary" icon="locks">Lock service</Button>
                    <Button variant="primary">Edit event</Button>
                  </>
                }
              />
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-palette" title="CommandPalette" description="Opens over a scrim and follows the page theme.">
        <ThemeColumns>{() => <PaletteDemo />}</ThemeColumns>
      </Section>
    </>
  )
}
