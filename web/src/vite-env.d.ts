/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_MODE?: string
  readonly VITE_BASE_URL?: string
  readonly VITE_API_URL?: string
  readonly VITE_SLACK_EVENTS_CHANNEL_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
