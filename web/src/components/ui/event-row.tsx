import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { nextListIndex } from '@/lib/list-navigation'
import type { DsStatus } from '@/lib/status'
import { cn } from '@/lib/utils'
import { ImpactMark } from './impact-mark'
import { StatusMark } from './status-mark'

export type Density = 'comfortable' | 'compact'

export interface EventRowData {
  id: string
  /** "15:04", in mono. */
  time: string
  status: DsStatus
  title: string
  /** Adds a compact ImpactMark before the status tag. */
  impact?: boolean
  /** Ordered metadata (type, environment, priority, team), joined by " · ". */
  meta?: string | (string | null | undefined | false)[]
}

export interface EventRowProps extends Omit<EventRowData, 'id'> {
  density?: Density
  selected?: boolean
  onSelect?: () => void
  tabIndex?: number
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  rowRef?: (el: HTMLDivElement | null) => void
}

function metaText(meta: EventRowData['meta']) {
  if (!meta) return ''
  return Array.isArray(meta) ? meta.filter(Boolean).join(' · ') : meta
}

/**
 * The event row: time, title over its metadata, then the impact and status tags on the
 * right edge, where only deviations and what is running stand out. Use it inside EventList.
 */
export function EventRow({
  time,
  status,
  title,
  impact,
  meta,
  density = 'comfortable',
  selected = false,
  onSelect,
  tabIndex = 0,
  onKeyDown,
  rowRef,
}: EventRowProps) {
  const compact = density === 'compact'
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.key === 'Enter' || event.key === ' ') && onSelect) {
      event.preventDefault()
      onSelect()
    }
    onKeyDown?.(event)
  }
  return (
    <div
      ref={rowRef}
      role="option"
      aria-selected={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={handleKey}
      className={cn(
        'grid w-full cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-space-3 border-t border-rule-soft px-space-3 text-left',
        'transition-colors duration-[120ms] ease-ds',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
        compact ? 'py-row-pad-compact' : 'py-row-pad-comfy',
        selected ? 'bg-signature-wash' : 'bg-transparent hover:bg-sunken',
      )}
    >
      <span className="font-mono text-[12px] leading-[19px] text-muted tabular-nums">{time}</span>
      <span className={cn('flex min-w-0', compact ? 'flex-row items-baseline gap-space-3' : 'flex-col gap-space-1')}>
        <span
          className={cn(
            'min-w-0 overflow-hidden text-ellipsis text-[14px] leading-[19px] font-medium text-ink',
            compact && 'flex-[0_1_auto] whitespace-nowrap',
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'min-w-0 overflow-hidden font-mono text-[11px] leading-4 text-ellipsis whitespace-nowrap text-muted',
            compact && 'flex-[1_1_0]',
          )}
        >
          {metaText(meta)}
        </span>
      </span>
      <span className="flex h-[19px] items-center gap-1.5 justify-self-end">
        {impact && <ImpactMark compact />}
        <StatusMark status={status} />
      </span>
    </div>
  )
}

export interface EventListProps {
  events: EventRowData[]
  density?: Density
  selectedId?: string
  /** Called on click, Enter, Space, and when ↑ ↓ Home End move the selection. */
  onSelect?: (event: EventRowData) => void
  /** Accessible name of the listbox. */
  label?: string
  className?: string
}

/**
 * A listbox of event rows. One row is in the tab order; ↑ ↓ Home End move the focus and the
 * selection together, so a drawer bound to the selection follows.
 */
export function EventList({ events, density = 'comfortable', selectedId, onSelect, label = 'Events', className }: EventListProps) {
  const selectedIndex = selectedId === undefined ? -1 : events.findIndex((e) => e.id === selectedId)
  const [focusIndex, setFocusIndex] = useState(selectedIndex)
  const rows = useRef<(HTMLDivElement | null)[]>([])

  // The selection can change from outside (a drawer, the URL): the tab stop follows it.
  useEffect(() => {
    if (selectedIndex >= 0) setFocusIndex(selectedIndex)
  }, [selectedIndex])

  const tabStop = Math.min(Math.max(focusIndex, 0), Math.max(events.length - 1, 0))

  function handleKey(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const next = nextListIndex(index, event.key, events.length)
    if (next === null) return
    event.preventDefault()
    setFocusIndex(next)
    rows.current[next]?.focus()
    if (next !== index || selectedIndex !== next) onSelect?.(events[next])
  }

  return (
    <div role="listbox" aria-label={label} className={cn('flex flex-col', className)}>
      {events.map((event, i) => (
        <EventRow
          key={event.id}
          {...event}
          density={density}
          selected={event.id === selectedId}
          tabIndex={i === tabStop ? 0 : -1}
          onSelect={() => {
            setFocusIndex(i)
            onSelect?.(event)
          }}
          onKeyDown={(e) => handleKey(e, i)}
          rowRef={(el) => {
            rows.current[i] = el
          }}
        />
      ))}
    </div>
  )
}
