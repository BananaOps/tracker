import { useTheme } from '../contexts/ThemeContext'

export default function ThemeTest() {
  const { theme, effectiveTheme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dark Mode Test Page</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Test the dark mode implementation
        </p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Theme Status</h3>
        <div className="space-y-2">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Selected Theme:</strong> {theme}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Effective Theme:</strong> {effectiveTheme}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>HTML Class:</strong> {document.documentElement.className}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>System Preference:</strong>{' '}
            {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Theme Switch</h3>
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
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Text Colors</h4>
          <div className="space-y-1">
            <p className="text-gray-900 dark:text-gray-100">Gray 900 / 100</p>
            <p className="text-gray-700 dark:text-gray-300">Gray 700 / 300</p>
            <p className="text-gray-500 dark:text-gray-400">Gray 500 / 400</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Backgrounds</h4>
          <div className="space-y-2">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-900 dark:text-gray-100">Gray 50 / 700</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded">
              <p className="text-sm text-gray-900 dark:text-gray-100">Gray 100 / 600</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Form Elements</h4>
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

      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Card with explicit classes</h4>
        <p className="text-gray-700 dark:text-gray-300">
          This card has explicit dark mode classes to ensure proper styling.
        </p>
      </div>
    </div>
  )
}
