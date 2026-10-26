import { createContext, useContext } from 'react'

export type CreatePanelType = 'event' | 'lock' | 'rpa' | 'service' | 'drift'

interface CreatePanelContextValue {
  openPanel: CreatePanelType | null
  open: (type: CreatePanelType) => void
  close: () => void
  /** Increments after every successful creation, so list pages can refetch. */
  createdTick: number
  notifyCreated: () => void
}

// The provider lives in CreatePanelContext.tsx: a module that exports
// components only keeps React Fast Refresh working.
export const CreatePanelContext = createContext<CreatePanelContextValue | undefined>(undefined)

export function useCreatePanel() {
  const ctx = useContext(CreatePanelContext)
  if (!ctx) {
    throw new Error('useCreatePanel must be used within a CreatePanelProvider')
  }
  return ctx
}
