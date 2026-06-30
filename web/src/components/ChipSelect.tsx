import type { MouseEvent, ReactNode } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export interface ChipVisual {
  bg: string
  text: string
  border: string
  darkBorder?: string
}

export interface ChipOption<T extends string> {
  value: T
  label: string
  visual: ChipVisual
  icon?: ReactNode
}

interface ChipSelectProps<T extends string> {
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

/**
 * A badge-style single-select. Renders each option as a clickable chip using
 * the same visual language as the StatusBadge / EnvBadge components, so picking
 * a value is a single click and the selection reads like the badges shown
 * everywhere else in the app.
 */
export default function ChipSelect<T extends string>({ options, value, onChange, ariaLabel }: ChipSelectProps<T>) {
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'
  const baseBorder = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgb(var(--hud-outline-var) / 0.6)'
  const baseText = isDark ? 'rgb(var(--hud-on-surface-var))' : 'rgb(var(--hud-on-surface-var))'
  const baseBg = isDark ? 'rgb(var(--hud-surface-low))' : 'rgb(var(--hud-surface-low))'

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = opt.value === value
        const selectedBorder = isDark ? (opt.visual.darkBorder ?? opt.visual.border) : opt.visual.border

        const handleEnter = (e: MouseEvent<HTMLButtonElement>) => {
          if (selected) return
          e.currentTarget.style.background = opt.visual.bg
          e.currentTarget.style.color = opt.visual.text
          e.currentTarget.style.borderColor = selectedBorder
        }
        const handleLeave = (e: MouseEvent<HTMLButtonElement>) => {
          if (selected) return
          e.currentTarget.style.background = baseBg
          e.currentTarget.style.color = baseText
          e.currentTarget.style.borderColor = baseBorder
        }

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide border transition-all duration-150 hover:-translate-y-px active:scale-95"
            style={
              selected
                ? {
                    background: opt.visual.bg,
                    color: opt.visual.text,
                    borderColor: selectedBorder,
                    boxShadow: `0 0 0 1.5px ${selectedBorder}, 0 2px 10px rgb(0 0 0 / ${isDark ? '0.18' : '0.07'})`,
                  }
                : {
                    background: baseBg,
                    color: baseText,
                    borderColor: baseBorder,
                  }
            }
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
