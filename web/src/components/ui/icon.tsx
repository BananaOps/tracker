import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { icons, type IconName } from './icons'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Pixel size; the set is drawn on a 16 px grid. */
  size?: number
  /** Accessible name. Omit it for a decorative icon, which is then hidden from assistive tech. */
  title?: string
}

/** An icon of the Tracker set. Inherits currentColor. */
export function Icon({ name, size = 16, title, className, ...rest }: IconProps) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }
  return (
    <svg
      className={cn('inline-block shrink-0 align-middle', className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...a11y}
      {...rest}
    >
      {icons[name].map((path, i) =>
        typeof path === 'string' ? (
          <path key={i} d={path} />
        ) : (
          <path key={i} d={path.d} strokeDasharray={path.dash} strokeLinecap={path.cap ?? 'square'} />
        ),
      )}
    </svg>
  )
}
