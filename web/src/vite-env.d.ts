/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_MODE?: string
  readonly VITE_BASE_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TOKEN?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_BUY_ME_COFFEE_URL?: string
  readonly VITE_JIRA_DOMAIN?: string
  readonly VITE_JIRA_PROJECT_KEY?: string
  readonly VITE_SLACK_WORKSPACE?: string
  readonly VITE_SLACK_EVENTS_CHANNEL?: string
  readonly VITE_CLARITY_PROJECT_ID?: string
  readonly VITE_LINKS?: string
  readonly VITE_HOMER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
