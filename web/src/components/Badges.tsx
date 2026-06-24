import { getStatusLabel, getEnvironmentLabel } from '../lib/eventUtils'

// ─── Status ───────────────────────────────────────────────────────────────────
export function getStatusVisual(status?: string | number): { bg: string; text: string; border: string; icon: string } {
  const s = String(status ?? '').toLowerCase()
  const is = (...keys: string[]) => keys.includes(s)
  if (is('success', '3', 'done', '11')) return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', icon: 'fa-circle-check' }
  if (is('failure', '2', 'error', '5', 'failed')) return { bg: '#FEECEC', text: '#B42318', border: '#FBD4D4', icon: 'fa-circle-xmark' }
  if (is('warning', '4')) return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0', icon: 'fa-triangle-exclamation' }
  if (is('start', '1', 'in_progress', '12')) return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', icon: 'fa-satellite-dish' }
  if (is('planned', '13')) return { bg: '#F3EEFF', text: '#5B21B6', border: '#DDCFFA', icon: 'fa-clock' }
  if (is('waiting_approval', '14')) return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0', icon: 'fa-hourglass-half' }
  if (is('open', '9')) return { bg: '#F3EEFF', text: '#5B21B6', border: '#DDCFFA', icon: 'fa-circle-dot' }
  if (is('close', '10', 'closed')) return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8', icon: 'fa-circle-xmark' }
  return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8', icon: 'fa-circle-info' }
}

export function StatusBadge({ status }: { status?: string | number }) {
  const v = getStatusVisual(status)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-6 h-6 rounded-md flex items-center justify-center border shrink-0" style={{ background: v.bg, color: v.text, borderColor: v.border }}>
        <i className={`fa-solid ${v.icon} text-[10px]`} />
      </span>
      <span className="text-[10px] font-semibold uppercase" style={{ color: v.text }}>{getStatusLabel(status as never)}</span>
    </span>
  )
}

// ─── Environment ────────────────────────────────────────────────────────────────
export function getEnvVisual(env?: string | number): { bg: string; text: string; border: string } {
  const e = String(env ?? '').toLowerCase()
  const is = (...keys: string[]) => keys.includes(e)
  if (is('production', '7')) return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
  if (is('preproduction', '6')) return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
  if (is('uat', '4', 'recette', '5', 'tnr', '3')) return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
  if (is('integration', '2')) return { bg: '#E6FBF6', text: '#0F766E', border: '#B7EFE4' }
  if (is('development', '1')) return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
  return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
}

export function EnvBadge({ env }: { env?: string | number }) {
  if (env === undefined || env === null || env === '') {
    return <span className="text-xs" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>—</span>
  }
  const v = getEnvVisual(env)
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase border" style={{ background: v.bg, color: v.text, borderColor: v.border }}>
      {getEnvironmentLabel(String(env) as never)}
    </span>
  )
}
