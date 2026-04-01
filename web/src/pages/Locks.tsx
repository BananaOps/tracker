import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, type Lock } from '../lib/api'
import { Lock as LockIcon, Unlock, RefreshCw, AlertCircle, Eye } from 'lucide-react'
import { getEnvironmentLabel } from '../lib/eventUtils'

export default function Locks() {
  const navigate = useNavigate()
  const [locks, setLocks] = useState<Lock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false)
  const [selectedLock, setSelectedLock] = useState<Lock | null>(null)
  const [unlockUser, setUnlockUser] = useState('')
  const [unlockUserError, setUnlockUserError] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // ── Design tokens ────────────────────────────────────────────────────────────
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:             'rgb(var(--hud-bg))',
    surface:        'rgb(var(--hud-surface))',
    surfaceLow:     'rgb(var(--hud-surface-low))',
    surfaceHigh:    'rgb(var(--hud-surface-high))',
    primary:        'rgb(var(--hud-primary))',
    primaryDim:     'rgb(var(--hud-primary-dim))',
    tertiary:       'rgb(var(--hud-tertiary))',
    error:          'rgb(var(--hud-error))',
    success:        'rgb(var(--hud-success))',
    onSurface:      'rgb(var(--hud-on-surface))',
    onSurfaceVar:   'rgb(var(--hud-on-surface-var))',
    outlineVar:     'rgb(var(--hud-outline-var))',
  }

  const loadLocks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await locksApi.list()
      setLocks(data.locks || [])
    } catch (err) {
      setError('Error loading locks')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocks()
  }, [])

  const handleUnlock = (lock: Lock) => {
    setSelectedLock(lock)
    setShowUnlockPrompt(true)
    setUnlockUser('')
    setUnlockUserError(false)
  }

  const handleUnlockConfirm = async () => {
    if (!unlockUser.trim()) {
      setUnlockUserError(true)
      return
    }
    if (!selectedLock) return
    try {
      setUnlocking(selectedLock.id)
      setShowUnlockPrompt(false)
      await locksApi.unlock(selectedLock.id)
      await loadLocks()
    } catch (err) {
      alert('Error unlocking service')
      console.error(err)
    } finally {
      setUnlocking(null)
    }
  }

  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp)
      return isNaN(date.getTime()) ? null : date
    }
    if (timestamp.seconds !== undefined) {
      const milliseconds = Number(timestamp.seconds) * 1000 + (timestamp.nanos || 0) / 1000000
      return new Date(milliseconds)
    }
    return null
  }

  const formatDate = (timestamp: any) => {
    const date = parseTimestamp(timestamp)
    if (!date) return '-'
    try {
      return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    } catch { return '-' }
  }

  const getTimeSince = (timestamp: any) => {
    const created = parseTimestamp(timestamp)
    if (!created) return '-'
    try {
      const diffMs = Date.now() - created.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return '< 1m'
      if (diffMins < 60) return `${diffMins}m`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h`
      return `${Math.floor(diffHours / 24)}j`
    } catch { return '-' }
  }

  const EnvBadge = ({ env }: { env: string }) => {
    const colors: Record<string, string> = {
      production: T.error, preproduction: '#f97316', uat: T.tertiary,
      recette: '#8b5cf6', integration: T.primary, development: T.success,
    }
    const c = colors[env?.toLowerCase()] || T.onSurfaceVar
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold"
        style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
        {getEnvironmentLabel(env)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: T.primary }} />
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="max-w-7xl mx-auto p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Locks
            </h1>
            <p className="mt-1 text-sm" style={{ color: T.onSurfaceVar }}>
              Manage deployment and operation locks
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-8"
            style={{ background: a('error', 0.1), border: `1px solid ${a('error', 0.2)}` }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: T.error }} />
            <span className="text-sm" style={{ color: T.error }}>{error}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Locks', value: locks.length, color: T.primary, icon: <LockIcon className="w-5 h-5" /> },
            { label: 'Unique Services', value: new Set(locks.map(l => l.service)).size, color: T.tertiary, icon: <AlertCircle className="w-5 h-5" /> },
            { label: 'Environments', value: new Set(locks.map(l => l.environment)).size, color: T.success, icon: <Unlock className="w-5 h-5" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="relative p-6 rounded-xl overflow-hidden"
              style={{ background: T.surfaceLow, borderLeft: `2px solid ${color}` }}>
              <div className="absolute top-3 right-3 opacity-10 pointer-events-none" style={{ color }}>
                <div className="w-16 h-16 blur-xl rounded-full" style={{ background: color }} />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>{label}</p>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</span>
                <span style={{ color }}>{icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {locks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ background: T.surface }}>
            <Unlock className="w-16 h-16 mb-4 opacity-20" style={{ color: T.onSurfaceVar }} />
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No active locks</h3>
            <p className="text-sm mb-6" style={{ color: T.onSurfaceVar }}>All services are currently unlocked</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
                  {['Service', 'Environment', 'Resource', 'Locked By', 'Created At', 'Duration', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: T.onSurfaceVar }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locks.map((lock) => (
                  <tr key={lock.id}
                    onMouseEnter={() => setHoveredRow(lock.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: `1px solid ${a('outline-var', 0.08)}`,
                      background: hoveredRow === lock.id ? a('outline-var', 0.05) : 'transparent',
                      transition: 'background 0.15s'
                    }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <LockIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.error }} />
                        <span className="text-sm font-medium">{lock.service}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <EnvBadge env={lock.environment} />
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: T.onSurfaceVar }}>
                      {lock.resource || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium">{lock.who}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: T.onSurfaceVar, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatDate((lock as any).createdAt || lock.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: a('primary', 0.1), color: T.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                        {getTimeSince((lock as any).createdAt || lock.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {lock.event_id && (
                          <button onClick={() => navigate(`/events/timeline?event=${lock.event_id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                            style={{ color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}`, background: T.surfaceHigh }}>
                            <Eye className="w-3 h-3" /> View Event
                          </button>
                        )}
                        <button onClick={() => handleUnlock(lock)} disabled={unlocking === lock.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                          style={{ color: 'white', background: T.error }}>
                          {unlocking === lock.id
                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Unlocking...</>
                            : <><Unlock className="w-3 h-3" /> Unlock</>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      {showUnlockPrompt && selectedLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUnlockPrompt(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
            style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
            <div className="flex items-center gap-3 mb-6">
              <Unlock className="w-5 h-5" style={{ color: T.primary }} />
              <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Unlock Service</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: T.onSurfaceVar }}>
              Enter your name to unlock <strong style={{ color: T.onSurface }}>{selectedLock.service}</strong> in <strong style={{ color: T.onSurface }}>{getEnvironmentLabel(selectedLock.environment)}</strong>
            </p>
            <div className="mb-6">
              <label className="block text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>
                Your Name <span style={{ color: T.error }}>*</span>
              </label>
              <input
                type="text"
                value={unlockUser}
                onChange={(e) => { setUnlockUser(e.target.value); setUnlockUserError(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockConfirm() }}
                placeholder="e.g., john.doe"
                autoFocus
                className="w-full border-0 border-b-2 px-4 py-3 rounded-t-lg text-sm focus:outline-none transition-all"
                style={{
                  background: T.surfaceLow,
                  color: T.onSurface,
                  borderColor: unlockUserError ? T.error : 'transparent',
                }}
              />
              {unlockUserError && (
                <p className="mt-1 text-xs" style={{ color: T.error }}>Name is required</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUnlockPrompt(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleUnlockConfirm} disabled={unlocking === selectedLock.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDim})`, color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
                <Unlock className="w-4 h-4" />
                {unlocking === selectedLock.id ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative glows */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: a('primary', 0.04) }} />
    </div>
  )
}
