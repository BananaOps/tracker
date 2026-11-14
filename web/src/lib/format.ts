// Formats of the design system voice: 24 h times ("15:04", "15:04:12" in the drawer) and
// dates as "07 apr 2026", in the viewer's time zone.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const two = (n: number) => String(n).padStart(2, '0')

function toDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "15:04", or "15:04:12" with seconds. Empty for an invalid date. */
export function formatTime(value: Date | string, seconds = false): string {
  const date = toDate(value)
  if (!date) return ''
  const hm = `${two(date.getHours())}:${two(date.getMinutes())}`
  return seconds ? `${hm}:${two(date.getSeconds())}` : hm
}

/** "07 apr 2026". Empty for an invalid date. */
export function formatDate(value: Date | string): string {
  const date = toDate(value)
  if (!date) return ''
  return `${two(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** True when both values fall on the same calendar day. */
export function sameDay(a: Date | string, b: Date | string): boolean {
  const x = toDate(a)
  const y = toDate(b)
  return !!x && !!y && x.toDateString() === y.toDateString()
}
