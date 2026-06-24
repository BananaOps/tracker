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
      <button onClick={cycleTheme}
        className="p-2 rounded-md bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.12] transition-colors"
        title={`Current: ${theme} mode (click to change)`} type="button"
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }

  const btn = (t: typeof theme, Icon: typeof Sun, title: string) => (
    <button onClick={() => setTheme(t)}
      className={`p-2 rounded-lg transition-colors ${
        theme === t
          ? 'bg-white/[0.14] text-white shadow-sm'
          : 'text-white/55 hover:text-white'
      }`}
      title={title} type="button"
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className="flex items-center space-x-1 bg-white/[0.06] rounded-md p-1">
      {btn('light', Sun, 'Light mode')}
      {btn('dark', Moon, 'Dark mode')}
      {btn('system', Monitor, 'System mode')}
    </div>
  )
}
