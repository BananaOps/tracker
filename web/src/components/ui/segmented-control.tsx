import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedControlProps {
  /** Two to five short options (period, density, view). Beyond that, use a menu. */
  options: string[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Accessible name of the group. */
  label?: string
  className?: string
}

/** An exclusive choice: mono options, the active one sits on surface in a sunken track. */
export function SegmentedControl({ options, value, defaultValue, onChange, label = 'Options', className }: SegmentedControlProps) {
  const [inner, setInner] = useState(defaultValue ?? options[0])
  const current = value !== undefined ? value : inner

  function pick(option: string) {
    if (value === undefined) setInner(option)
    onChange?.(option)
  }

  return (
    <div role="group" aria-label={label} className={cn('inline-flex gap-0.5 rounded-[7px] bg-sunken p-[3px]', className)}>
      {options.map((option) => {
        const pressed = option === current
        return (
          <button
            key={option}
            type="button"
            aria-pressed={pressed}
            onClick={() => pick(option)}
            className={cn(
              'h-control-sm cursor-pointer rounded-sm border px-3 font-mono text-[12px]',
              'transition-colors duration-[120ms] ease-ds',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
              pressed ? 'border-rule bg-surface font-medium text-ink' : 'border-transparent bg-transparent text-muted hover:text-ink',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
