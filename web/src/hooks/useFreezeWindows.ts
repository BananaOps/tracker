import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FreezeWindow, FreezeWindowDraft } from '../types/freezeWindow'
import { freezeWindowsApi } from '../lib/api'

interface UseFreezeWindowsReturn {
  windows: FreezeWindow[]
  add: (draft: FreezeWindowDraft) => void
  update: (id: string, patch: Partial<FreezeWindowDraft>) => void
  remove: (id: string) => void
  /** Toggle the active flag without opening the drawer */
  toggle: (id: string) => void
}

export function useFreezeWindows(): UseFreezeWindowsReturn {
  const queryClient = useQueryClient()
  const queryKey = ['freeze-windows']

  const { data } = useQuery({
    queryKey,
    queryFn: () => freezeWindowsApi.list(),
    staleTime: 30_000,
  })

  const windows = data?.freezeWindows ?? []

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient])

  const addMutation = useMutation({
    mutationFn: (draft: FreezeWindowDraft) => freezeWindowsApi.create(draft),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FreezeWindowDraft> }) => {
      const existing = windows.find(w => w.id === id)
      if (!existing) throw new Error(`freeze window ${id} not found`)
      const merged: FreezeWindowDraft = {
        title: patch.title ?? existing.title,
        description: patch.description ?? existing.description ?? '',
        type: patch.type ?? existing.type,
        scopeType: patch.scopeType ?? existing.scopeType,
        scopeIds: patch.scopeIds ?? existing.scopeIds ?? [],
        startsAt: patch.startsAt ?? existing.startsAt,
        endsAt: patch.endsAt ?? existing.endsAt,
        timezone: patch.timezone ?? existing.timezone,
        createdBy: patch.createdBy ?? existing.createdBy,
        active: patch.active ?? existing.active ?? true,
      }
      return freezeWindowsApi.update(id, merged)
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => freezeWindowsApi.delete(id),
    onSuccess: invalidate,
  })

  const add = useCallback((draft: FreezeWindowDraft) => {
    addMutation.mutate(draft)
  }, [addMutation])

  const update = useCallback((id: string, patch: Partial<FreezeWindowDraft>) => {
    updateMutation.mutate({ id, patch })
  }, [updateMutation])

  const remove = useCallback((id: string) => {
    removeMutation.mutate(id)
  }, [removeMutation])

  const toggle = useCallback((id: string) => {
    const existing = windows.find(w => w.id === id)
    if (!existing) return
    updateMutation.mutate({
      id,
      patch: { active: !(existing.active ?? true) },
    })
  }, [windows, updateMutation])

  return { windows, add, update, remove, toggle }
}
