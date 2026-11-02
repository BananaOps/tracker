import { useQuery } from '@tanstack/react-query'
import { eventsApi, locksApi } from '../lib/api'
import { isActiveDrift } from '../lib/drifts'
import { EventType } from '../types/api'

/** Counts that call for action in the navigation: active locks and drifts to handle. */
export function useNavCounts(): Record<string, number | undefined> {
  const { data: locks } = useQuery({
    queryKey: ['nav-counts', 'locks'],
    queryFn: () => locksApi.list(),
    staleTime: 60_000,
  })
  const { data: drifts } = useQuery({
    queryKey: ['nav-counts', 'drifts'],
    queryFn: () => eventsApi.search({ type: EventType.DRIFT }),
    staleTime: 60_000,
  })
  const lockCount = locks?.locks?.length
  const driftCount = drifts?.events?.filter(isActiveDrift).length
  return {
    Locks: lockCount || undefined,
    Drifts: driftCount || undefined,
  }
}
