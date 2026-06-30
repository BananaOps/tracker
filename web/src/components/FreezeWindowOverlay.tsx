import type { CSSProperties } from 'react'
import type { FreezeWindow } from '../types/freezeWindow'
import { getFreezePalette } from '../lib/freezeWindowUtils'

// ─── Day cell overlay ─────────────────────────────────────────────────────────

interface FreezeWindowDayOverlayProps {
  freezeWindows: FreezeWindow[]
}

/**
 * Renders a subtle background overlay inside a calendar day cell
 * when one or more freeze windows cover that day.
 * Designed to sit behind event chips without obscuring them.
 *
 * Usage: render inside each calendar day button, before the events list.
 */
export function FreezeWindowDayOverlay({ freezeWindows }: FreezeWindowDayOverlayProps) {
  if (freezeWindows.length === 0) return null

  // Hard freeze takes visual priority over soft
  const dominant = freezeWindows.find(fw => fw.type === 'hard') ?? freezeWindows[0]
  const palette = getFreezePalette(dominant.type)

  return (
    <div
      className="absolute inset-0 rounded-lg pointer-events-none z-0"
      style={{ background: palette.bgOverlay, borderBottom: `2px solid ${palette.border}` }}
      title={dominant.title}
    />
  )
}

// ─── Legend pill ──────────────────────────────────────────────────────────────

interface FreezeWindowPillProps {
  freeze: FreezeWindow
  onClick?: () => void
}

/**
 * Small pill shown inside a day cell to label the freeze window.
 * Appears below the day number, above events.
 */
export function FreezeWindowPill({ freeze, onClick }: FreezeWindowPillProps) {
  const palette = getFreezePalette(freeze.type)
  const icon = freeze.type === 'hard' ? '🔒' : '⚠️'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight"
      style={{
        background: palette.badge,
        color: palette.text,
        border: `1px solid ${palette.border}`,
      } as CSSProperties}
      title={freeze.description ?? freeze.title}
    >
      {icon} {freeze.title}
    </button>
  )
}

// ─── Sidebar / list entry ─────────────────────────────────────────────────────

interface FreezeWindowListItemProps {
  freeze: FreezeWindow
  onEdit?: (fw: FreezeWindow) => void
  onToggle?: (id: string) => void
  onDelete?: (id: string) => void
}

/**
 * Row component for a list of freeze windows (e.g. in the sidebar panel).
 */
export function FreezeWindowListItem({
  freeze,
  onEdit,
  onToggle,
  onDelete,
}: FreezeWindowListItemProps) {
  const palette = getFreezePalette(freeze.type)
  const isInactive = freeze.active === false

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg transition-opacity"
      style={{
        background: isInactive ? 'transparent' : palette.bg,
        border: `1px solid ${isInactive ? 'rgb(var(--hud-outline-var) / 0.15)' : palette.border}`,
        opacity: isInactive ? 0.5 : 1,
      }}
    >
      {/* Type badge */}
      <span
        className="shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
        style={{ background: palette.badge, color: palette.text, border: `1px solid ${palette.border}` }}
      >
        {freeze.type}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'rgb(var(--hud-on-surface))' }}>
          {freeze.title}
        </p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
          {freeze.scopeType === 'global'
            ? 'Global'
            : `${freeze.scopeType}: ${(freeze.scopeIds ?? []).join(', ')}`}
        </p>
        <p className="text-[10px] tabular-nums mt-0.5" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
          {formatFreezeRange(freeze)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {onToggle && (
          <button
            type="button"
            onClick={() => onToggle(freeze.id)}
            className="text-[10px] px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(var(--hud-on-surface-var))' }}
            title={isInactive ? 'Enable' : 'Disable'}
          >
            {isInactive ? '↑' : '↓'}
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(freeze)}
            className="text-[10px] px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(var(--hud-on-surface-var))' }}
            title="Edit"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(freeze.id)}
            className="text-[10px] px-1.5 py-0.5 rounded hover:text-red-400 transition-colors"
            style={{ color: 'rgb(var(--hud-on-surface-var))' }}
            title="Delete"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFreezeRange(fw: FreezeWindow): string {
  const start = new Date(fw.startsAt)
  const end = new Date(fw.endsAt)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return `${start.toLocaleDateString('en-US', opts)} → ${end.toLocaleDateString('en-US', opts)}`
}
