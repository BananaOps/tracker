import { cn } from '@/lib/utils'
import { DS_STATUSES, statusTone, type DsStatus } from '@/lib/status'

export interface GlyphProps {
  status: DsStatus
  size?: number
  className?: string
}

/**
 * Status glyphs: 16 px grid, round caps (unlike the square-capped icon set), each with an
 * inner sign so that it reads in greyscale. failed = square + ✕, warning = triangle + !,
 * running = open arc + dot, done = circle + ✓, open = empty circle. Decorative: the caller
 * names it.
 */
export function Glyph({ status, size = 12, className }: GlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
    className: cn('block shrink-0', status === 'running' && 'origin-center motion-safe:animate-status-spin', className),
  }
  const mark = { fill: 'none', className: 'stroke-on-status', strokeWidth: 1.75, strokeLinecap: 'round' as const }

  switch (status) {
    case 'failed':
      return (
        <svg {...common}>
          <rect x={1} y={1} width={14} height={14} rx={3} fill="currentColor" />
          <path d="M5.6 5.6 L10.4 10.4 M10.4 5.6 L5.6 10.4" {...mark} />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <path d="M8 1.2 L15.1 14.4 L0.9 14.4 Z" fill="currentColor" stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round" />
          <path d="M8 6.3 V9.4 M8 11.9 V12" {...mark} />
        </svg>
      )
    case 'running':
      return (
        <svg {...common}>
          <path d="M8 1.75 A6.25 6.25 0 1 1 1.75 8" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
          <circle cx={8} cy={8} r={2.1} fill="currentColor" />
        </svg>
      )
    case 'open':
      return (
        <svg {...common}>
          <circle cx={8} cy={8} r={6.25} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx={8} cy={8} r={6.25} fill="none" stroke="currentColor" strokeWidth={1.5} />
          <path d="M5.1 8.2 L7.1 10.2 L10.9 6.1" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

const TAG: Record<DsStatus, string> = {
  failed: 'bg-failed-wash text-failed',
  warning: 'bg-warning-wash text-warning',
  running: 'bg-signature text-on-signature',
  done: 'border-tag-line font-normal text-muted',
  open: 'border-dashed border-tag-line font-normal text-muted',
}

export interface StatusMarkProps {
  status: DsStatus
  /** Overrides the label, which otherwise is the status itself (never translated). */
  text?: string
  /** false renders the glyph alone, coloured by its tone, with the label as accessible name. */
  label?: boolean
  /** Glyph size when label is false. */
  size?: number
  className?: string
}

/**
 * The status tag: a 12 px glyph and a mono label in a 22 px container. The only place where
 * the failed and warning colours appear; never draw a status by hand.
 */
export function StatusMark({ status, text, label = true, size = 14, className }: StatusMarkProps) {
  const s: DsStatus = DS_STATUSES.includes(status) ? status : 'done'
  const name = text ?? s
  if (!label) {
    return (
      <span role="img" aria-label={name} className={cn('inline-flex items-center', statusTone[s], className)}>
        <Glyph status={s} size={size} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-[4px] border border-transparent pr-2 pl-1.5',
        'font-mono text-[11px] leading-4 font-medium',
        TAG[s],
        className,
      )}
    >
      <Glyph status={s} size={12} />
      <span>{name}</span>
    </span>
  )
}

