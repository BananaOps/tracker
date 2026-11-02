import { describe, expect, it } from 'vitest'
import { isTypingTarget, resolveShortcut } from './shortcuts'

const key = (k: string, extra: Partial<Parameters<typeof resolveShortcut>[0]> = {}) => ({ key: k, typing: false, ...extra })

describe('resolveShortcut', () => {
  it('opens the palette with ⌘K or Ctrl+K, even while typing', () => {
    expect(resolveShortcut(key('k', { metaKey: true }), false).action).toEqual({ kind: 'palette' })
    expect(resolveShortcut(key('K', { ctrlKey: true, typing: true }), false).action).toEqual({ kind: 'palette' })
  })

  it('focuses the page filter with /', () => {
    expect(resolveShortcut(key('/'), false).action).toEqual({ kind: 'focusFilter' })
  })

  it('navigates with G then D, T or S', () => {
    const g = resolveShortcut(key('g'), false)
    expect(g).toEqual({ action: null, pending: true })
    expect(resolveShortcut(key('t'), true).action).toEqual({ kind: 'go', to: '/events/timeline' })
    expect(resolveShortcut(key('d'), true).action).toEqual({ kind: 'go', to: '/dashboard' })
    expect(resolveShortcut(key('s'), true).action).toEqual({ kind: 'go', to: '/events/streamline' })
    expect(resolveShortcut(key('x'), true)).toEqual({ action: null, pending: false })
    expect(resolveShortcut(key('t'), false).action).toBeNull()
  })

  it('ignores plain keys while typing or with a modifier', () => {
    expect(resolveShortcut(key('/', { typing: true }), false).action).toBeNull()
    expect(resolveShortcut(key('t', { typing: true }), true).action).toBeNull()
    expect(resolveShortcut(key('g', { altKey: true }), false).pending).toBe(false)
  })
})

describe('isTypingTarget', () => {
  it('recognises text fields and editable elements', () => {
    const text = document.createElement('input')
    const box = document.createElement('input')
    box.type = 'checkbox'
    const div = document.createElement('div')
    div.contentEditable = 'true'
    expect(isTypingTarget(text)).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(box)).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
