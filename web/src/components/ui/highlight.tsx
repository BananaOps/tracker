import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface HighlightProps {
  children: ReactNode
  /** Mono 11 px chip for data ("running", "now 15:31"). */
  data?: boolean
  className?: string
}

/**
 * The highlighter: a signature fill under on-signature text. It marks the present only
 * (what is running, "now"); never use it to stress a word.
 */
export function Highlight({ children, data = false, className }: HighlightProps) {
  return (
    <span
      className={cn(
        'rounded-xs bg-signature px-[5px] py-px text-on-signature box-decoration-clone',
        data && 'inline-block px-1.5 py-0.5 font-mono text-[11px] leading-4 font-medium',
        className,
      )}
    >
      {children}
    </span>
  )
}
