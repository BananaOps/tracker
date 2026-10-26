import { describe, expect, it } from 'vitest'
import { getEnvironmentLabel, getPriorityLabel, getStatusLabel } from './eventUtils'
import { Environment } from '../types/api'

describe('labels', () => {
  it('names environments from their enum name or API number', () => {
    expect(getEnvironmentLabel(Environment.PRODUCTION)).toBe('Production')
    expect(getEnvironmentLabel('7')).toBe('Production')
    expect(getEnvironmentLabel('TNR')).toBe('TNR')
  })

  it('has no environment label for an empty environment', () => {
    // callers provide their own fallback ("N/A", the raw value)
    expect(getEnvironmentLabel(undefined)).toBeNull()
  })

  it('falls back for unknown priorities and statuses', () => {
    expect(getPriorityLabel(undefined)).toBe('P?')
    expect(getStatusLabel(undefined)).toBe('Unknown')
  })
})
