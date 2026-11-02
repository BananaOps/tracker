/**
 * Index reached from `current` with a navigation key in a list of `length` items,
 * or null when the key does not move. ArrowUp / ArrowDown stop at the ends; with
 * nothing current yet (-1), they land on the first item.
 */
export function nextListIndex(current: number, key: string, length: number): number | null {
  if (length <= 0) return null
  if (current < 0 && (key === 'ArrowDown' || key === 'ArrowUp')) return 0
  const from = Math.min(Math.max(current, 0), length - 1)
  switch (key) {
    case 'ArrowDown':
      return Math.min(from + 1, length - 1)
    case 'ArrowUp':
      return Math.max(from - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return null
  }
}
