import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeToggleProps {
  compact?: boolean
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  if (compact) {
    const cycleTheme = () => {
      if (theme === 'light') setTheme('dark')
      else if (theme === 'dark') setTheme('system')
      else setTheme('light')
    }
    const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
    return (
      <button
        onClick={cycleTheme}
        className="p-2 rounded-md bg-hud-surface-low text-hud-on-surface-var hover:text-hud-on-surface hover:bg-hud-surface-high transition-colors border border-hud-outline-var/50"
        title={`Current: ${theme} mode (click to change)`}
        type="button"
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }

  const btn = (t: typeof theme, Icon: typeof Sun, title: string) => (
    <button
      onClick={() => setTheme(t)}
      className={`p-2 rounded-lg transition-colors ${
        theme === t
          ? 'bg-hud-surface-high text-hud-on-surface shadow-sm'
          : 'text-hud-on-surface-var hover:text-hud-on-surface hover:bg-hud-surface-high'
      }`}
      title={title}
      type="button"
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className="flex items-center space-x-1 bg-hud-surface-low rounded-md p-1 border border-hud-outline-var/50">
      {btn('light', Sun, 'Light mode')}
      {btn('dark', Moon, 'Dark mode')}
      {btn('system', Monitor, 'System mode')}
    </div>
  )
}
