import { useEffect, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface FormPanelProps {
  /** Small icon shown in the header badge. */
  icon: ReactNode
  title: string
  subtitle?: string
  /** Accent color (CSS color) used for the header badge + primary action. */
  accent?: string
  /** Max width of the panel. */
  size?: 'md' | 'lg'
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  submitLabel: string
  submitIcon?: ReactNode
  submitting?: boolean
  submitDisabled?: boolean
  /** Optional error banner rendered at the top of the scrollable body. */
  error?: ReactNode
  children: ReactNode
}

export default function FormPanel({
  icon,
  title,
  subtitle,
  accent,
  size = 'md',
  onClose,
  onSubmit,
  submitLabel,
  submitIcon,
  submitting = false,
  submitDisabled = false,
  error,
  children,
}: FormPanelProps) {
  const { effectiveTheme } = useTheme()
  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
  const hud = {
    surface: 'rgb(var(--hud-surface))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    primary: 'rgb(var(--hud-primary))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
  }
  const accentColor = accent || hud.primary

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Side Panel */}
      <form
        onSubmit={onSubmit}
        className={`animate-slide-in relative h-full w-full shadow-2xl overflow-hidden flex flex-col ${
          size === 'lg' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
        style={{
          background: effectiveTheme === 'dark' ? ha('surface', 0.92) : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${ha('outline-var', 0.2)}`,
          color: hud.onSurface,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
            style={{ background: ha('primary-dim', 0.1) }}
          />
          <div
            className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full blur-[100px]"
            style={{ background: ha('tertiary', 0.08) }}
          />
        </div>

        {/* Header */}
        <div
          className="relative z-10 px-7 py-5 shrink-0 flex items-center gap-4"
          style={{ borderBottom: `1px solid ${ha('outline-var', 0.15)}` }}
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}1a`, color: accentColor, border: `1px solid ${accentColor}33` }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] mt-0.5 truncate" style={{ color: hud.onSurfaceVar }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors shrink-0 hover:bg-black/5"
            style={{ color: hud.onSurfaceVar }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="relative z-10 flex-1 overflow-y-auto px-7 py-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${ha('outline-var', 0.4)} transparent` }}
        >
          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6"
              style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}
            >
              <i className="fa-solid fa-circle-exclamation mt-0.5" style={{ color: 'rgb(var(--hud-error))' }} />
              <div className="text-sm font-medium" style={{ color: 'rgb(var(--hud-error))' }}>
                {error}
              </div>
            </div>
          )}
          {children}
        </div>

        {/* Sticky footer */}
        <div
          className="relative z-10 px-7 py-4 shrink-0 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}`, background: ha('surface-high', 0.4) }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: hud.onSurfaceVar }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || submitDisabled}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: accentColor, boxShadow: `0 4px 16px ${accentColor}40` }}
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {submitLabel}
              </>
            ) : (
              <>
                {submitIcon}
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
