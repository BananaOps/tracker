import { cn } from '@/lib/utils'
import { Icon } from './icon'

export interface ImpactMarkProps {
  /** Icon only, 22 × 22: the default in rows and dense places. */
  compact?: boolean
  /** Label of the full version. */
  text?: string
  /** Tooltip and accessible name. */
  title?: string
  className?: string
}

/**
 * The user impact marker (event attribute impact = true): magenta waves on impact-wash,
 * as tall as the status tag. Independent of the status, shown next to it, never instead.
 */
export function ImpactMark({ compact = false, text = 'impact', title = 'Users impacted', className }: ImpactMarkProps) {
  const base = 'inline-flex h-[22px] items-center rounded-[4px] bg-impact-wash text-impact'
  if (compact) {
    return (
      <span role="img" aria-label={title} title={title} className={cn(base, 'w-[22px] justify-center', className)}>
        <Icon name="impact" size={12} />
      </span>
    )
  }
  return (
    <span
      title={title}
      className={cn(base, 'gap-1 whitespace-nowrap pr-[7px] pl-[5px] font-mono text-[11px] leading-4 font-medium', className)}
    >
      <Icon name="impact" size={12} />
      <span>{text}</span>
    </span>
  )
}
