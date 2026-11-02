import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type ThemeId = 'light' | 'dark'

/** Renders its content twice, in a light and in a dark panel, whatever the page theme. */
export function ThemeColumns({ children }: { children: (theme: ThemeId) => ReactNode }) {
  return (
    <div className="grid gap-space-6 lg:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={cn(theme, 'min-w-0 rounded-md border border-rule bg-paper p-space-5 text-ink')}>
          <p className="mb-space-4 text-data-sm text-muted">{theme}</p>
          {children(theme)}
        </div>
      ))}
    </div>
  )
}

export function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-4">
      <div className="flex flex-col gap-space-1">
        <h2 id={id} className="text-title text-ink">{title}</h2>
        <p className="text-body text-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

/** A labelled row of examples inside a theme panel. */
export function Example({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-space-2">
      <span className="text-data-sm text-muted">{label}</span>
      <div className={cn('flex flex-wrap items-center gap-space-3', className)}>{children}</div>
    </div>
  )
}
