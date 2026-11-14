import { Fragment, useId } from 'react'
import type { DsStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

export interface RulerMark {
  /** "HH:MM" or a decimal hour. */
  at: string | number
  status: DsStatus
}

export interface TimeRulerProps {
  /** First hour shown. */
  startHour?: number
  /** Last hour shown. */
  endHour?: number
  /** Alias of startHour. */
  from?: number
  /** Alias of endHour. */
  to?: number
  /** Places the "now" needle, "HH:MM". */
  now?: string
  marks?: RulerMark[]
  /** Width of the drawing in user units; the ruler stretches to its container. */
  width?: number
  /** Accessible name; a description of the axis by default. */
  label?: string
  className?: string
}

const MARK_CLASS: Record<DsStatus, string> = {
  failed: 'fill-failed',
  warning: 'fill-warning',
  running: 'fill-needle',
  done: 'fill-none stroke-muted [stroke-width:1.2]',
  open: 'fill-none stroke-muted [stroke-width:1.2] [stroke-dasharray:2_1.5]',
}

function toHours(t: string | number) {
  if (typeof t === 'number') return t
  const [h, m = '0'] = t.split(':')
  return parseInt(h, 10) + parseInt(m, 10) / 60
}

const pad = (n: number) => (n < 10 ? `0${n}` : String(n))

/**
 * The graduated ruler, motif of the brand and time axis of Tracker: an 8 px grid, hourly ticks,
 * event marks coloured by status and the needle topped by a "now" highlighter. Its ticks must
 * match the data below it; never use it as decoration.
 */
export function TimeRuler({ startHour, endHour, from, to, now, marks = [], width = 600, label, className }: TimeRulerProps) {
  const start = startHour ?? from ?? 12
  const end = endHour ?? to ?? 18
  const W = width
  const H = 40
  const perHour = W / (end - start)
  const gridId = `ruler-grid-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const x = (t: string | number) => (toHours(t) - start) * perHour

  const majors: number[] = []
  for (let hour = start; hour <= end; hour++) majors.push(hour)

  const nowX = now ? x(now) : null
  const nowLabel = now ? `now ${now}` : ''
  const chipW = nowLabel.length * 6.2 + 12
  const chipX = nowX != null ? Math.min(nowX, W - chipW) : 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? `Time axis from ${start}:00 to ${end}:00${now ? `, now ${now}` : ''}`}
      className={cn('block h-10 w-full overflow-visible', className)}
    >
      <defs>
        <pattern id={gridId} width={8} height={8} patternUnits="userSpaceOnUse">
          <path d="M8 0.5 H0.5 V8" fill="none" strokeWidth={1} className="stroke-grid" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={4} fill={`url(#${gridId})`} />
      {majors.map((hour, i) => {
        const mx = (hour - start) * perHour + 0.5
        return (
          <Fragment key={hour}>
            <line x1={mx} y1={26} x2={mx} y2={H} strokeWidth={1} className="stroke-ink" />
            {i < majors.length - 1 && (
              <text x={mx + 4.5} y={34} className="fill-muted font-mono text-[9.5px]">
                {`${pad(hour)}:00`}
              </text>
            )}
          </Fragment>
        )
      })}
      {marks.map((mark, i) => (
        <circle key={i} data-status={mark.status} cx={x(mark.at)} cy={14} r={3} className={MARK_CLASS[mark.status] ?? MARK_CLASS.done} />
      ))}
      {nowX != null && (
        <>
          <rect x={chipX} y={4} width={chipW} height={16} rx={3} className="fill-signature" />
          <text x={chipX + 6} y={15.5} className="fill-on-signature font-mono text-[9.5px] font-medium">
            {nowLabel}
          </text>
          <line x1={nowX} y1={4} x2={nowX} y2={H} strokeWidth={1.5} className="stroke-needle" />
        </>
      )}
    </svg>
  )
}
