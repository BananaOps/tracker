import type { ReactNode } from 'react'

interface AdminPageShellProps {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

export default function AdminPageShell({ title, description, actions, children }: AdminPageShellProps) {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-hud-on-surface">{title}</h1>
          <p className="text-sm text-hud-on-surface-var mt-1">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
