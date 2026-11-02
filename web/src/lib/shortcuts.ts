// Global keyboard shortcuts of the shell:
//   ⌘K / Ctrl+K  open the command palette (also inside a field)
//   /            focus the filter of the page
//   G then D, T, S  go to dashboard, timeline, streamline
// Plain keys are ignored while typing in a field.

export type ShortcutAction = { kind: 'palette' } | { kind: 'focusFilter' } | { kind: 'go'; to: string }

export interface KeyInput {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  /** The event comes from an input, a textarea, a select or an editable element. */
  typing: boolean
}

export const GO_TARGETS: Record<string, string> = {
  d: '/dashboard',
  t: '/events/timeline',
  s: '/events/streamline',
}

/** Time allowed between G and its second key. */
export const SEQUENCE_MS = 1500

export interface ShortcutResult {
  action: ShortcutAction | null
  /** True when G was pressed and the second key is awaited. */
  pending: boolean
}

export function resolveShortcut(input: KeyInput, pendingG: boolean): ShortcutResult {
  const key = input.key.toLowerCase()
  if ((input.metaKey || input.ctrlKey) && key === 'k') return { action: { kind: 'palette' }, pending: false }
  if (input.typing || input.metaKey || input.ctrlKey || input.altKey) return { action: null, pending: false }
  if (pendingG && GO_TARGETS[key]) return { action: { kind: 'go', to: GO_TARGETS[key] }, pending: false }
  if (key === 'g') return { action: null, pending: true }
  if (input.key === '/') return { action: { kind: 'focusFilter' }, pending: false }
  return { action: null, pending: false }
}

/** True for targets where keys type text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(type)
}
