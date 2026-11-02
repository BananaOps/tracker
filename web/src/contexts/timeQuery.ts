import { createContext, useContext } from 'react'

/** Search params that follow the user from one time view to another. */
export const TIME_PARAMS = ['q', 'from', 'to'] as const

interface TimeQueryMemory {
  /** The last q / from / to of a time view, as a search string without "?". */
  remembered: string
  remember: (search: string) => void
}

// The provider lives in TimeQueryContext.tsx: a module that exports
// components only keeps React Fast Refresh working.
export const TimeQueryContext = createContext<TimeQueryMemory>({ remembered: '', remember: () => {} })

export function useTimeQueryMemory() {
  return useContext(TimeQueryContext)
}

/** The time view params of a search string, in a stable order. */
export function pickTimeParams(params: URLSearchParams): string {
  const out = new URLSearchParams()
  for (const key of TIME_PARAMS) {
    const value = params.get(key)
    if (value) out.set(key, value)
  }
  return out.toString()
}
