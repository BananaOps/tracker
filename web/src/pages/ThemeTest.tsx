import { useTheme } from '../contexts/ThemeContext'

export default function ThemeTest() {
  const { theme, effectiveTheme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-hud-on-surface">Dark Mode Test Page</h2>
        <p className="mt-1 text-sm text-hud-on-surface-var">
          Test the dark mode implementation
        </p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-hud-on-surface mb-4">Theme Status</h3>
        <div className="space-y-2">
          <p className="text-hud-on-surface-var">
            <strong>Selected Theme:</strong> {theme}
          </p>
          <p className="text-hud-on-surface-var">
            <strong>Effective Theme:</strong> {effectiveTheme}
          </p>
          <p className="text-hud-on-surface-var">
            <strong>HTML Class:</strong> {document.documentElement.className}
          </p>
          <p className="text-hud-on-surface-var">
            <strong>System Preference:</strong>{' '}
            {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-hud-on-surface mb-4">Quick Theme Switch</h3>
        <div className="flex space-x-3">
          <button onClick={() => setTheme('light')} className="btn-primary">
            Set Light
          </button>
          <button onClick={() => setTheme('dark')} className="btn-primary">
            Set Dark
          </button>
          <button onClick={() => setTheme('system')} className="btn-secondary">
            Set System
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h4 className="font-semibold text-hud-on-surface mb-2">Text Colors</h4>
          <div className="space-y-1">
            <p className="text-hud-on-surface">Primary</p>
            <p className="text-hud-on-surface-var">Muted</p>
            <p className="text-hud-on-surface-var/80">Subtle</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-hud-on-surface mb-2">Backgrounds</h4>
          <div className="space-y-2">
            <div className="p-2 bg-hud-surface-low rounded">
              <p className="text-sm text-hud-on-surface">Surface low</p>
            </div>
            <div className="p-2 bg-hud-surface-high rounded">
              <p className="text-sm text-hud-on-surface">Surface high</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold text-hud-on-surface mb-2">Form Elements</h4>
        <div className="space-y-3">
          <input type="text" className="input" placeholder="Test input field" />
          <select className="select">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
          <textarea className="input" rows={3} placeholder="Test textarea"></textarea>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Buttons</h4>
        <div className="flex space-x-3">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-secondary">Secondary Button</button>
        </div>
      </div>

      <div className="card bg-hud-surface border border-hud-outline-var/60">
        <h4 className="font-semibold text-hud-on-surface mb-2">Card with explicit classes</h4>
        <p className="text-hud-on-surface-var">
          This card uses Tracker theme tokens directly.
        </p>
      </div>
    </div>
  )
}
