import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps {
  children: ReactNode
  className?: string
}

/** A key or a shortcut, in mono 11 px inside a rule. Write the Mac symbols (⌘, ⌥, ↵). */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-block rounded-xs border border-rule bg-surface px-[5px] font-mono text-[11px] leading-4 text-muted',
        // Inside a primary button the key follows the button colours.
        'in-[.bg-ink]:border-current in-[.bg-ink]:bg-transparent in-[.bg-ink]:text-inherit in-[.bg-ink]:opacity-70',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
