import { useMemo, useState } from 'react'
import { isEmptyQuery, matchEvent, parseQuery, serializeQuery, type Query } from '../../lib/query'
import { currentView, deleteView, loadViews, saveView } from '../../lib/saved-views'
import type { Event } from '../../types/api'
import { QueryBar, QueryEmptyState } from '../ui/query-bar'
import { SavedViews } from '../ui/saved-views'

interface TimeViewFiltersProps {
  query: Query
  onChange: (query: Query) => void
  /** Events of the period, before the filter. */
  events: Event[]
  /** Number of results once filtered. */
  resultCount: number
  /** Noun of the results: "events", "scheduled events". */
  noun?: string
}

const SYNCED = 'synced to timeline, streamline, calendar'

/**
 * Saved views, the QueryBar and the result line shared by Timeline, Streamline and Calendar.
 * The query lives in the URL and follows the user from one view to another.
 */
export function TimeViewFilters({ query, onChange, events, resultCount, noun = 'events' }: TimeViewFiltersProps) {
  const [views, setViews] = useState(loadViews)
  const q = serializeQuery(query)
  const current = currentView(views, q)

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const view of views) {
      const vq = parseQuery(view.q)
      out[view.id] = events.filter((e) => matchEvent(e, vq)).length
    }
    return out
  }, [views, events])

  const filtered = !isEmptyQuery(query)
  return (
    <div className="flex flex-col gap-space-3">
      <SavedViews
        views={views}
        currentId={current?.id}
        counts={counts}
        onSelect={(view) => onChange(parseQuery(view.q))}
        onSave={filtered && !current ? (label) => setViews(saveView(label, q)) : undefined}
        onDelete={(id) => setViews(deleteView(id))}
      />
      <QueryBar query={query} onChange={onChange} events={events} label={`Filter ${noun}`} />
      {filtered && resultCount === 0 ? (
        <QueryEmptyState query={query} events={events} onChange={onChange} what={`No ${noun} match`} />
      ) : (
        <span className="font-mono text-[11px] text-muted">
          {`${resultCount} ${resultCount === 1 ? noun.replace(/s$/, '') : noun}${filtered ? ' · filtered' : ''} · ${SYNCED}`}
        </span>
      )}
    </div>
  )
}
