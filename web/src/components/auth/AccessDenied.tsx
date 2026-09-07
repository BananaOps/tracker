import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

interface AccessDeniedProps {
  title?: string
  message?: string
}

export default function AccessDenied({
  title = 'Access denied',
  message = 'Your account does not have the permission required for this page. Ask an administrator to add you to a team that grants it.',
}: AccessDeniedProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="max-w-md w-full rounded-lg p-8 text-center"
        style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.65)' }}
      >
        <ShieldOff className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgb(var(--hud-error))' }} />
        <h1 className="text-xl font-semibold text-hud-on-surface mb-2">{title}</h1>
        <p className="text-sm text-hud-on-surface-var mb-6">{message}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 h-9 rounded-md text-sm font-semibold text-white"
          style={{ background: 'rgb(var(--hud-primary))' }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
