import type { ReactNode } from 'react'
import { Label } from '../ui/label'

export function AdminTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgb(var(--hud-outline-var) / 0.65)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'rgb(var(--hud-surface-high))' }}>
            {columns.map((c) => (
              <th key={c} className="text-left font-semibold text-xs uppercase tracking-wide px-4 py-2.5 text-hud-on-surface-var">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ background: 'rgb(var(--hud-surface))' }}>{children}</tbody>
      </table>
    </div>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <tr style={{ borderTop: '1px solid rgb(var(--hud-outline-var) / 0.5)' }}>{children}</tr>
}

export function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 align-middle text-hud-on-surface ${className}`}>{children}</td>
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-hud-on-surface-var">
        {message}
      </td>
    </tr>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm rounded-md px-3 py-2" style={{ color: 'rgb(var(--hud-error))', background: 'rgb(var(--hud-error) / 0.1)' }}>
      {message}
    </p>
  )
}

export function FieldRow({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-hud-on-surface-var">{hint}</p>}
    </div>
  )
}

/** "Never" for missing timestamps, otherwise a compact local date-time. */
// eslint-disable-next-line react-refresh/only-export-components -- shared admin table/form helper file, not itself a component
export function formatDate(iso?: string): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// eslint-disable-next-line react-refresh/only-export-components -- shared query keys, not a component
export const QUERY_KEYS = {
  users: ['auth', 'users'] as const,
  teams: ['auth', 'teams'] as const,
  apiKeys: ['auth', 'api-keys'] as const,
}
