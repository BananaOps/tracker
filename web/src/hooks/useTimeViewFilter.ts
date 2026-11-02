import { useMemo, useState } from 'react'
import { isEmptyQuery, matchEvent, toSearchParams } from '../lib/query'
import type { Event } from '../types/api'
import { useTimeQuery, type Period } from './useTimeQuery'

/**
 * The shared filter of a time view: the query of the URL, the part SearchEvents applies on
 * the server (to spread into eventsApi.search and its query key), and the client filter.
 * The period falls back to the given default, computed once.
 */
export function useTimeViewFilter(defaultPeriod: () => Required<Period>) {
  const { query, setQuery, period, setPeriod } = useTimeQuery()
  const [fallback] = useState(defaultPeriod)
  const serverParams = useMemo(() => toSearchParams(query), [query])
  const from = period.from ?? fallback.from
  const to = period.to ?? fallback.to
  const filter = useMemo(() => (events: Event[]) => (isEmptyQuery(query) ? events : events.filter((e) => matchEvent(e, query))), [query])
  return { query, setQuery, serverParams, filter, from, to, periodFromUrl: !!period.from, setPeriod }
}
