import { describe, expect, it } from 'vitest'
import { formatDate, formatTime, sameDay } from './format'

const at = new Date(2026, 3, 7, 9, 4, 12) // 07 apr 2026, 09:04:12 local

describe('format', () => {
  it('writes 24 h times, with seconds on request', () => {
    expect(formatTime(at)).toBe('09:04')
    expect(formatTime(at.toISOString(), true)).toBe('09:04:12')
  })

  it('writes dates as 07 apr 2026', () => {
    expect(formatDate(at)).toBe('07 apr 2026')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatTime('nope')).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('compares calendar days', () => {
    expect(sameDay(at, new Date(2026, 3, 7, 23, 59))).toBe(true)
    expect(sameDay(at, new Date(2026, 3, 8, 0, 1))).toBe(false)
  })
})
