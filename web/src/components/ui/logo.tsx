import { cn } from '@/lib/utils'

export interface LogoProps {
  /** Height of the symbol in px (never below 16). The wordmark follows at 78 %. */
  size?: number
  /** Show the "tracker" wordmark. */
  word?: boolean
  className?: string
}

/**
 * The "highlighted T" symbol and the "tracker" wordmark, drawn with the tokens so that
 * they follow the theme. Outside the product, use the SVG files of docs/design-system/assets/logos.
 */
export function Logo({ size = 24, word = true, className }: LogoProps) {
  return (
    <span role="img" aria-label="Tracker" className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
        <rect x={0} y={0} width={44} height={44} rx={8} className="fill-ink" />
        <rect x={19} y={12} width={6} height={22} rx={1} className="fill-surface" />
        <rect x={9} y={11} width={26} height={8} rx={1.5} className="fill-signature" />
      </svg>
      {word && (
        <span
          aria-hidden="true"
          className="font-sans font-semibold tracking-[-0.035em]"
          style={{ fontSize: `${Math.round(size * 0.78)}px` }}
        >
          tracker
        </span>
      )}
    </span>
  )
}
