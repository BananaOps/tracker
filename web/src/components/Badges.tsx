import { getStatusLabel, getEnvironmentLabel } from '../lib/eventUtils'
import { useTheme } from '../contexts/theme'
import { getEnvVisual, getStatusVisual } from '../lib/badgeVisuals'

// ─── Status ───────────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: string | number }) {
  const { effectiveTheme } = useTheme()
  const v = getStatusVisual(status)
  const borderColor = effectiveTheme === 'dark' ? (v.darkBorder ?? v.border) : v.border
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-6 h-6 rounded-md flex items-center justify-center border shrink-0" style={{ background: v.bg, color: v.text, borderColor }}>
        <i className={`fa-solid ${v.icon} text-[10px]${v.icon === 'fa-satellite-dish' ? ' fa-fade' : ''}`} />
      </span>
      <span className="text-[10px] font-semibold uppercase" style={{ color: v.text }}>{getStatusLabel(status as never)}</span>
    </span>
  )
}

// ─── Environment ────────────────────────────────────────────────────────────────
export function EnvBadge({ env }: { env?: string | number }) {
  const { effectiveTheme } = useTheme()
  if (env === undefined || env === null || env === '') {
    return <span className="text-xs" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>—</span>
  }
  const v = getEnvVisual(env)
  const borderColor = effectiveTheme === 'dark' ? (v.darkBorder ?? v.border) : v.border
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase border" style={{ background: v.bg, color: v.text, borderColor }}>
      {getEnvironmentLabel(String(env) as never)}
    </span>
  )
}
