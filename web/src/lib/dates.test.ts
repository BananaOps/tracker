import { describe, expect, it } from 'vitest'
import { parseTimestamp } from './dates'

describe('parseTimestamp', () => {
  it('parses RFC 3339 strings', () => {
    expect(parseTimestamp('2026-01-15T10:30:00Z')?.toISOString()).toBe('2026-01-15T10:30:00.000Z')
  })

  it('parses protobuf seconds and nanos', () => {
    expect(parseTimestamp({ seconds: '1768473000', nanos: 500_000_000 })?.toISOString()).toBe('2026-01-15T10:30:00.500Z')
  })

  it('returns null for missing or invalid values', () => {
    expect(parseTimestamp(undefined)).toBeNull()
    expect(parseTimestamp('')).toBeNull()
    expect(parseTimestamp('not a date')).toBeNull()
  })
})
