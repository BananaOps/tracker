import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'
import { config } from './config'

// Initialize Microsoft Clarity if a project ID is configured
if (config.clarityProjectId) {
  const clarityId = config.clarityProjectId
  ;(function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] = c[a] || function (...args: unknown[]) { (c[a].q = c[a].q || []).push(args) }
    const t = l.createElement(r) as HTMLScriptElement
    t.async = true
    t.src = 'https://www.clarity.ms/tag/' + i
    const y = l.getElementsByTagName(r)[0]
    y.parentNode!.insertBefore(t, y)
  })(window, document, 'clarity', 'script', clarityId)
}

// FontAwesome configuration
import { library } from '@fortawesome/fontawesome-svg-core'
import { faJira, faSlack, faGithub, faDiscord, faTelegram, faMicrosoft } from '@fortawesome/free-brands-svg-icons'
import { faCodeBranch, faRobot, faWrench, faRocket, faFire } from '@fortawesome/free-solid-svg-icons'

// Add icons to the library
library.add(
  faJira, faSlack, faGithub, faDiscord, faTelegram, faMicrosoft,
  faCodeBranch, faRobot, faWrench, faRocket, faFire
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
