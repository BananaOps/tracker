import { describe, expect, it } from 'vitest'
import { nextListIndex } from './list-navigation'

describe('nextListIndex', () => {
  it('moves down and up, and stops at the ends', () => {
    expect(nextListIndex(0, 'ArrowDown', 3)).toBe(1)
    expect(nextListIndex(2, 'ArrowDown', 3)).toBe(2)
    expect(nextListIndex(1, 'ArrowUp', 3)).toBe(0)
    expect(nextListIndex(0, 'ArrowUp', 3)).toBe(0)
  })

  it('jumps to the first and last items', () => {
    expect(nextListIndex(1, 'Home', 5)).toBe(0)
    expect(nextListIndex(1, 'End', 5)).toBe(4)
  })

  it('ignores other keys and empty lists', () => {
    expect(nextListIndex(1, 'a', 3)).toBeNull()
    expect(nextListIndex(0, 'ArrowDown', 0)).toBeNull()
  })

  it('lands on the first item when nothing is current yet', () => {
    expect(nextListIndex(-1, 'ArrowDown', 3)).toBe(0)
    expect(nextListIndex(-1, 'ArrowUp', 3)).toBe(0)
  })

  it('clamps a current index beyond the end', () => {
    expect(nextListIndex(9, 'ArrowUp', 3)).toBe(1)
  })
})
