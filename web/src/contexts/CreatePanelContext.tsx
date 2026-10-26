import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CreatePanelContext, type CreatePanelType } from './createPanel'

export function CreatePanelProvider({ children }: { children: ReactNode }) {
  const [openPanel, setOpenPanel] = useState<CreatePanelType | null>(null)
  const [createdTick, setCreatedTick] = useState(0)

  const open = useCallback((type: CreatePanelType) => setOpenPanel(type), [])
  const close = useCallback(() => setOpenPanel(null), [])
  const notifyCreated = useCallback(() => setCreatedTick((t) => t + 1), [])

  const value = useMemo(
    () => ({ openPanel, open, close, createdTick, notifyCreated }),
    [openPanel, open, close, createdTick, notifyCreated],
  )

  return <CreatePanelContext.Provider value={value}>{children}</CreatePanelContext.Provider>
}
