import { useMemo, useState, type ReactNode } from 'react'
import { TimeQueryContext } from './timeQuery'

/** Remembers the filters and period of the time views while the user moves around. */
export function TimeQueryProvider({ children }: { children: ReactNode }) {
  const [remembered, remember] = useState('')
  const value = useMemo(() => ({ remembered, remember }), [remembered])
  return <TimeQueryContext.Provider value={value}>{children}</TimeQueryContext.Provider>
}
