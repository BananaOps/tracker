import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { pickTimeParams, useTimeQueryMemory } from '../contexts/timeQuery'
import { parseQuery, serializeQuery, type Query } from '../lib/query'

export interface Period {
  from?: Date
  to?: Date
}

function toDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * The filter query and period of a time view (Timeline, Streamline, Calendar), kept in the URL
 * (?q=…&from=…&to=…) so that a filtered view can be shared, and remembered across the time
 * views: arriving without any, a view takes the last ones back.
 */
export function useTimeQuery() {
  const [params, setParams] = useSearchParams()
  const { remembered, remember } = useTimeQueryMemory()
  const { pathname } = useLocation()
  const current = pickTimeParams(params)

  // Arriving on a view without filters nor period: take the remembered ones back, once per
  // page (the component may stay mounted from one route to another).
  const restoredFor = useRef<string | null>(null)
  useEffect(() => {
    if (restoredFor.current === pathname) return
    restoredFor.current = pathname
    if (!current && remembered) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          new URLSearchParams(remembered).forEach((v, k) => next.set(k, v))
          return next
        },
        { replace: true },
      )
    }
  }, [pathname, current, remembered, setParams])

  useEffect(() => {
    if (restoredFor.current === pathname) remember(current)
  }, [pathname, current, remember])

  const q = params.get('q') ?? ''
  const query = useMemo(() => parseQuery(q), [q])
  const from = params.get('from')
  const to = params.get('to')
  const period = useMemo<Period>(() => ({ from: toDate(from), to: toDate(to) }), [from, to])

  const update = useCallback(
    (values: Record<string, string | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(values)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setQuery = useCallback((next: Query) => update({ q: serializeQuery(next) || undefined }), [update])
  const setPeriod = useCallback(
    (next: Period) => update({ from: next.from?.toISOString(), to: next.to?.toISOString() }),
    [update],
  )

  return { q, query, setQuery, period, setPeriod }
}
