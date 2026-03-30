/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        hud: {
          bg:               'rgb(var(--hud-bg) / <alpha-value>)',
          surface:          'rgb(var(--hud-surface) / <alpha-value>)',
          'surface-low':    'rgb(var(--hud-surface-low) / <alpha-value>)',
          'surface-high':   'rgb(var(--hud-surface-high) / <alpha-value>)',
          'surface-highest':'rgb(var(--hud-surface-highest) / <alpha-value>)',
          primary:          'rgb(var(--hud-primary) / <alpha-value>)',
          'primary-dim':    'rgb(var(--hud-primary-dim) / <alpha-value>)',
          secondary:        'rgb(var(--hud-secondary) / <alpha-value>)',
          tertiary:         'rgb(var(--hud-tertiary) / <alpha-value>)',
          'on-surface':     'rgb(var(--hud-on-surface) / <alpha-value>)',
          'on-surface-var': 'rgb(var(--hud-on-surface-var) / <alpha-value>)',
          outline:          'rgb(var(--hud-outline) / <alpha-value>)',
          'outline-var':    'rgb(var(--hud-outline-var) / <alpha-value>)',
          success:          'rgb(var(--hud-success) / <alpha-value>)',
          error:            'rgb(var(--hud-error) / <alpha-value>)',
          warning:          'rgb(var(--hud-warning) / <alpha-value>)',
        },
      },
      fontFamily: {
        grotesk: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px 1px currentColor' },
          '50%': { boxShadow: '0 0 10px 3px currentColor' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
