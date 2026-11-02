import { describe, expect, it } from 'vitest'
import { cn, typeStyles } from './utils'

describe('cn', () => {
  it('keeps a type style next to a text colour', () => {
    expect(cn('text-title', 'text-ink')).toBe('text-title text-ink')
    expect(cn('text-muted', 'text-data-sm')).toBe('text-muted text-data-sm')
  })

  it('lets a later type style replace an earlier one', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption')
    expect(cn('text-sm', 'text-data')).toBe('text-data')
  })

  it('treats shadow-overlay as a shadow', () => {
    expect(cn('shadow-xs', 'shadow-overlay')).toBe('shadow-overlay')
  })

  it('knows the twelve type styles of tokens.json', () => {
    expect(typeStyles).toEqual([
      'metric-xl', 'metric', 'title-lg', 'title', 'title-sm', 'summary',
      'body-strong', 'body', 'caption', 'data', 'data-sm', 'data-strong',
    ])
  })
})
