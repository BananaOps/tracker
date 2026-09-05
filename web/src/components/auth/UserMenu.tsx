import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, KeyRound, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { loginPathFor } from '../../lib/authEvents'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserMenu() {
  const { principal, logout, showToast } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const buttonClass = 'flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all duration-150'
  const buttonStyle = {
    color: 'rgb(var(--hud-on-surface-var))',
    border: '1px solid rgb(var(--hud-outline-var))',
    background: 'rgb(var(--hud-surface))',
  }

  if (principal.kind !== 'user') {
    return (
      <Link to={loginPathFor(location)} className={buttonClass} style={buttonStyle}>
        <LogIn className="w-3 h-3" />
        Sign in
      </Link>
    )
  }

  const name = principal.displayName || principal.username

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClass}
        style={buttonStyle}
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: 'rgb(var(--hud-primary))' }}
        >
          {initials(name)}
        </span>
        <span className="max-w-[140px] truncate">{name}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 rounded-md shadow-lg overflow-hidden z-50"
          style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var))' }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.6)' }}>
            <p className="text-sm font-semibold text-hud-on-surface truncate">{name}</p>
            <p className="text-xs text-hud-on-surface-var truncate">{principal.username}</p>
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-hud-surface-high text-hud-on-surface-var">
                {principal.source || 'session'}
              </span>
              {principal.isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: 'rgb(var(--hud-primary))', background: 'rgb(var(--hud-primary) / 0.1)' }}>
                  <ShieldCheck className="w-3 h-3" /> admin
                </span>
              )}
              {principal.teams.map((t) => (
                <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-hud-surface-high text-hud-on-surface-var">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          <div className="py-1">
            {principal.source === 'local' && (
              <Link
                role="menuitem"
                to="/account/password"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-hud-on-surface hover:bg-hud-surface-high"
              >
                <KeyRound className="w-4 h-4 text-hud-on-surface-var" />
                Change password
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                logout().catch(() => showToast('Sign out failed'))
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-hud-on-surface hover:bg-hud-surface-high"
            >
              <LogOut className="w-4 h-4 text-hud-on-surface-var" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
