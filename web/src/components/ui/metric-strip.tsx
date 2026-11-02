import { cn } from '@/lib/utils'
import { Glyph } from './status-mark'

export interface Metric {
  /** Mono lowercase label: "events / 24h", never "TOTAL EVENTS". */
  label: string
  value: string
  /** Caption under the value: "3 of 5 finished". */
  sub?: string
  /** Only when the value itself is a problem (failures > 0), or users impacted > 0. */
  tone?: 'failed' | 'warning' | 'impact'
  /** Comparison with the previous period: "−3.2 pts vs prev.". Its sign follows the value. */
  delta?: string
  /** worse is amber with a warning glyph; better and flat stay neutral. */
  trend?: 'better' | 'worse' | 'flat'
}

export interface MetricStripProps {
  items: Metric[]
  /** Accessible name of the strip. */
  label?: string
  className?: string
}

const TONE = { failed: 'text-failed', warning: 'text-warning', impact: 'text-impact' } as const

const TREND_TITLE = {
  worse: 'Worse than the previous period',
  better: 'Better than the previous period',
  flat: 'Compared with the previous period',
} as const

/** Three to five figures in a sunken band under the summary sentence. */
export function MetricStrip({ items, label = 'Metrics', className }: MetricStripProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] rounded-md bg-sunken', className)}
    >
      {items.map((metric, i) => {
        const trend = metric.trend ?? 'flat'
        return (
          <div key={i} className="flex min-w-0 flex-col gap-space-1 px-space-4 py-3.5 not-first:border-l not-first:border-rule">
            <span className="font-mono text-[11px] leading-4 text-muted">{metric.label}</span>
            <span className={cn('text-metric text-ink', metric.tone && TONE[metric.tone])}>{metric.value}</span>
            {metric.sub && <span className="text-caption text-muted">{metric.sub}</span>}
            {metric.delta && (
              <span
                title={TREND_TITLE[trend]}
                className={cn(
                  'inline-flex items-center gap-[5px] font-mono text-[11px] leading-4',
                  trend === 'worse' ? 'font-medium text-warning' : 'text-muted',
                )}
              >
                {trend === 'worse' && <Glyph status="warning" size={10} />}
                <span>{metric.delta}</span>
                <span className="sr-only">{`, ${TREND_TITLE[trend].toLowerCase()}`}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
