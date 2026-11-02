import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTypingTarget, resolveShortcut, SEQUENCE_MS } from '../lib/shortcuts'

export interface ShortcutHandlers {
  /** ⌘K / Ctrl+K. */
  onPalette: () => void
}

/**
 * Global shortcuts of the shell: ⌘K opens the palette, / focuses the filter of the page
 * (the element marked data-page-filter), G then D, T or S navigates. Plain keys are ignored
 * while typing in a field.
 */
export function useShortcuts({ onPalette }: ShortcutHandlers) {
  const navigate = useNavigate()
  const pendingG = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const palette = useRef(onPalette)
  palette.current = onPalette

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return
      const { action, pending } = resolveShortcut(
        { key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, typing: isTypingTarget(e.target) },
        pendingG.current,
      )
      window.clearTimeout(timer.current)
      pendingG.current = pending
      if (pending) {
        timer.current = window.setTimeout(() => {
          pendingG.current = false
        }, SEQUENCE_MS)
      }
      if (!action) return
      e.preventDefault()
      if (action.kind === 'palette') palette.current()
      else if (action.kind === 'focusFilter') document.querySelector<HTMLElement>('[data-page-filter]')?.focus()
      else navigate(action.to)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timer.current)
    }
  }, [navigate])
}
