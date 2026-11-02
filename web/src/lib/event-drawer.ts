import { ChangeType, type ChangelogEntry, type Event, type EventType } from '@/types/api'
import { formatDate, formatTime, sameDay } from './format'
import { toDsStatus, type DsStatus } from './status'

export interface EventLink {
  /** "#1287", "PAY-342". */
  label: string
  href?: string
  /** Tooltip, e.g. the title of the PR or ticket. */
  title?: string
}

export interface HistoryItem {
  time: string
  status: DsStatus
  text: string
}

/** What the EventDrawer shows; see docs/design-system/components/EventDrawer.md. */
export interface DrawerEvent {
  status: DsStatus
  time: string
  title: string
  type?: EventType | string
  priority?: string
  service?: string
  environment?: string
  owner?: string
  stakeholders?: string[]
  /** true: full-width impact band; false: quiet "No user impact declared"; undefined: nothing. */
  impact?: boolean
  impactNote?: string
  /** null shows a dashed empty slot with a + button; undefined hides the links row. */
  pullRequest?: EventLink | null
  ticket?: EventLink | null
  /** Legacy meta line, shown only when service, environment and owner are absent. */
  meta?: string | string[]
  summary?: string
  /** Secondary details: [label, value, href?]. */
  fields?: [string, string, string?][]
  history?: HistoryItem[]
}

export interface ToDrawerEventOptions {
  /** Builds the URL of a ticket key (Jira). Without it, the ticket has no link. */
  ticketUrl?: (key: string) => string
}

/** "https://github.com/org/repo/pull/1287" → "#1287"; any other URL keeps a generic label. */
export function pullRequestLabel(url: string): string {
  const match = /\/(?:pull|merge_requests|pull-requests)\/(\d+)/.exec(url)
  return match ? `#${match[1]}` : 'link'
}

function historyText(entry: ChangelogEntry): string {
  const by = entry.user ? ` by ${entry.user}` : ''
  const comment = entry.comment ? `: ${entry.comment}` : ''
  switch (entry.changeType) {
    case ChangeType.CREATED:
      return `Created${by}`
    case ChangeType.STATUS_CHANGED:
      return `Status ${entry.oldValue ?? '…'} → ${entry.newValue ?? '…'}${by}`
    case ChangeType.UPDATED:
      return `${entry.field ? `${entry.field} updated` : 'Updated'}${by}`
    case ChangeType.APPROVED:
      return `Approved${by}${comment}`
    case ChangeType.REJECTED:
      return `Rejected${by}${comment}`
    case ChangeType.COMMENTED:
      return `Comment${by}${comment}`
    case ChangeType.LINKED:
      return `Linked${by}`
    case ChangeType.LOCKED:
      return `Locked${by}`
    case ChangeType.UNLOCKED:
      return `Unlocked${by}`
    default:
      return `${entry.changeType || 'Change'}${by}`
  }
}

function historyStatus(entry: ChangelogEntry): DsStatus {
  if (entry.changeType === ChangeType.STATUS_CHANGED) return toDsStatus(entry.newValue)
  if (entry.changeType === ChangeType.REJECTED) return 'failed'
  if (entry.changeType === ChangeType.CREATED) return 'open'
  return 'done'
}

/** The changelog, oldest first, as drawer history. Times show the date when not on `day`. */
export function toHistory(changelog: ChangelogEntry[] | undefined, day?: string): HistoryItem[] {
  return [...(changelog ?? [])]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((entry) => ({
      time: !day || sameDay(entry.timestamp, day) ? formatTime(entry.timestamp) : formatDate(entry.timestamp).slice(0, 6),
      status: historyStatus(entry),
      text: historyText(entry),
    }))
}

/** Maps an API event to what the drawer shows. */
export function toDrawerEvent(event: Event, options: ToDrawerEventOptions = {}): DrawerEvent {
  const a = event.attributes
  const when = a.startDate || event.metadata?.createdAt || ''
  const prUrl = event.links?.pullRequestLink
  const ticketKey = event.links?.ticket

  const fields: [string, string, string?][] = []
  if (a.source) fields.push(['source', a.source])
  if (a.startDate) fields.push(['start', `${formatDate(a.startDate)} ${formatTime(a.startDate, true)}`])
  if (a.endDate) fields.push(['end', `${formatDate(a.endDate)} ${formatTime(a.endDate, true)}`])
  if (event.metadata?.duration) fields.push(['duration', event.metadata.duration])
  if (a.notifications?.length) fields.push(['notifications', a.notifications.join(', ')])
  if (event.metadata?.id) fields.push(['id', event.metadata.id])

  return {
    status: toDsStatus(a.status),
    time: formatTime(when, true),
    title: event.title,
    type: a.type,
    priority: a.priority ? a.priority.toUpperCase() : undefined,
    service: a.service || undefined,
    environment: a.environment || undefined,
    owner: a.owner || undefined,
    stakeholders: a.stakeHolders?.length ? a.stakeHolders : undefined,
    impact: Boolean(a.impact),
    pullRequest: prUrl ? { label: pullRequestLabel(prUrl), href: prUrl } : null,
    ticket: ticketKey ? { label: ticketKey, href: options.ticketUrl?.(ticketKey) } : null,
    summary: a.message || undefined,
    fields,
    history: toHistory(event.changelog, when || undefined),
  }
}
