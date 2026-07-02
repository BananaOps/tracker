/** Small, pure numeric helpers shared across the risk engine. */

/** Clamp a value into an arbitrary [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Clamp a value into the [0, 1] range. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}
