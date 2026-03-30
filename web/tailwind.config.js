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
        // Vanguard Violet Design System
        vg: {
          bg:          '#060e20',
          surface:     '#0b1325',
          'surface-low':     '#131b2e',
          'surface-base':    '#171f32',
          'surface-high':    '#222a3d',
          'surface-highest': '#2d3448',
          'surface-bright':  '#31394d',
          primary:     '#d5bfff',
          'primary-dim': '#bd9dff',
          secondary:   '#c3c0ff',
          tertiary:    '#7ad6ed',
          'on-surface':         '#dae2fc',
          'on-surface-variant': '#cbc4d3',
          outline:     '#958e9c',
          'outline-variant': '#494551',
          success:     '#68dba9',
          error:       '#ff6e84',
          warning:     '#ffb784',
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
