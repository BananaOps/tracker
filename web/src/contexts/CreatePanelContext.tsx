import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type CreatePanelType = 'event' | 'lock' | 'rpa' | 'service' | 'drift'

interface CreatePanelContextValue {
  openPanel: CreatePanelType | null
  open: (type: CreatePanelType) => void
  close: () => void
  /** Increments after every successful creation, so list pages can refetch. */
  createdTick: number
  notifyCreated: () => void
}

const CreatePanelContext = createContext<CreatePanelContextValue | undefined>(undefined)

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

export function useCreatePanel() {
  const ctx = useContext(CreatePanelContext)
  if (!ctx) {
    throw new Error('useCreatePanel must be used within a CreatePanelProvider')
  }
  return ctx
}
