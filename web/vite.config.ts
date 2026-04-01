import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const homerUrl = env.VITE_HOMER_URL || ''
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    base: env.VITE_BASE_URL || '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        // In dev, proxy Homer config.yml directly to avoid CORS + no backend needed
        ...(homerUrl
          ? {
              '/homer-proxy': {
                target: homerUrl,
                changeOrigin: true,
                rewrite: (p: string) => p.replace(/^\/homer-proxy/, ''),
              },
            }
          : {}),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
    },
  }
})
