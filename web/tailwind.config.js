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
        hud: {
          bg:                 'rgb(var(--hud-bg) / <alpha-value>)',
          surface:            'rgb(var(--hud-surface) / <alpha-value>)',
          'surface-low':      'rgb(var(--hud-surface-low) / <alpha-value>)',
          'surface-high':     'rgb(var(--hud-surface-high) / <alpha-value>)',
          'surface-highest':  'rgb(var(--hud-surface-highest) / <alpha-value>)',
          primary:            'rgb(var(--hud-primary) / <alpha-value>)',
          'primary-dim':      'rgb(var(--hud-primary-dim) / <alpha-value>)',
          secondary:          'rgb(var(--hud-secondary) / <alpha-value>)',
          tertiary:           'rgb(var(--hud-tertiary) / <alpha-value>)',
          'on-surface':       'rgb(var(--hud-on-surface) / <alpha-value>)',
          'on-surface-var':   'rgb(var(--hud-on-surface-var) / <alpha-value>)',
          outline:            'rgb(var(--hud-outline) / <alpha-value>)',
          'outline-var':      'rgb(var(--hud-outline-var) / <alpha-value>)',
          success:            'rgb(var(--hud-success) / <alpha-value>)',
          error:              'rgb(var(--hud-error) / <alpha-value>)',
          warning:            'rgb(var(--hud-warning) / <alpha-value>)',
        },
      },
      fontFamily: {
        /* Keep the utility name; updated to Plus Jakarta Sans */
        grotesk: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      fontSize: {
        /* Intergalactic 8-step type scale */
        'fs-100': ['0.75rem',  { lineHeight: '1rem' }],     /* 12px */
        'fs-200': ['0.875rem', { lineHeight: '1.25rem' }],  /* 14px */
        'fs-300': ['1rem',     { lineHeight: '1.5rem' }],   /* 16px */
        'fs-400': ['1.25rem',  { lineHeight: '1.75rem' }],  /* 20px */
        'fs-500': ['1.5rem',   { lineHeight: '2rem' }],     /* 24px */
        'fs-600': ['2rem',     { lineHeight: '2.5rem' }],   /* 32px */
        'fs-700': ['2.25rem',  { lineHeight: '2.75rem' }],  /* 36px */
        'fs-800': ['3rem',     { lineHeight: '3.5rem' }],   /* 48px */
      },
      borderRadius: {
        /* Intergalactic standard radii */
        'ig-sm': '4px',
        'ig':    '6px',
        'ig-md': '8px',
        'ig-lg': '12px',
      },
      boxShadow: {
        'ig-card':       '0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)',
        'ig-card-hover': '0 4px 12px rgb(0 0 0 / 0.10), 0 1px 3px rgb(0 0 0 / 0.06)',
        'ig-dropdown':   '0 8px 24px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.08)',
        'ig-focus':      '0 0 0 3px rgb(var(--hud-primary) / 0.15)',
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
