import { useCallback, useEffect, useState } from 'react'

const KEY = 'tracker.sidebarCollapsed'
const NARROW = '(max-width: 959px)'

function readChoices(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function narrow() {
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW).matches
}

/**
 * Whether the sidebar is a rail on this page: the user's choice, remembered per page, or
 * collapsed by default under 960 px.
 */
export function useSidebarCollapsed(page: string): [boolean, () => void] {
  const [choices, setChoices] = useState(readChoices)
  const [isNarrow, setIsNarrow] = useState(narrow)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(NARROW)
    const onChange = () => setIsNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const collapsed = choices[page] ?? isNarrow
  const toggle = useCallback(() => {
    setChoices((prev) => {
      const next = { ...prev, [page]: !(prev[page] ?? narrow()) }
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Blocked storage: the choice lasts for this session.
      }
      return next
    })
  }, [page])
  return [collapsed, toggle]
}
