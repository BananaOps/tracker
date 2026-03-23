// Configuration de l'application
// La configuration est chargée depuis /config.js (injecté par le serveur)
// ou depuis les variables d'environnement pour le développement local

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LinkItem {
  name: string
  url: string
  description?: string
  /** Font Awesome icon: e.g. "fab fa-github", "fas fa-home" */
  icon?: string
  /** Background color for the icon, e.g. "#6366f1" */
  color?: string
  /** Direct image URL for the logo */
  logo?: string
}

export interface LinkGroup {
  name: string
  items: LinkItem[]
}

// Single source of truth for the global runtime config shape
export interface TrackerConfig {
  jira: {
    domain: string
    projectKey: string
  }
  slack: {
    workspace: string
    eventsChannel: string
  }
  links?: LinkGroup[]
  homerUrl?: string
  demoMode?: boolean
  buyMeCoffeeUrl?: string
}

declare global {
  interface Window {
    TRACKER_CONFIG?: TrackerConfig
  }
}

// ── Config object ─────────────────────────────────────────────────────────────

export const config: TrackerConfig & { api: { baseUrl: string } } = {
  jira: {
    domain:
      window.TRACKER_CONFIG?.jira?.domain ||
      (import.meta as any).env?.VITE_JIRA_DOMAIN ||
      'your-domain.atlassian.net',
    projectKey:
      window.TRACKER_CONFIG?.jira?.projectKey ||
      (import.meta as any).env?.VITE_JIRA_PROJECT_KEY ||
      '',
  },
  slack: {
    workspace:
      window.TRACKER_CONFIG?.slack?.workspace ||
      (import.meta as any).env?.VITE_SLACK_WORKSPACE ||
      'your-workspace',
    eventsChannel:
      window.TRACKER_CONFIG?.slack?.eventsChannel ||
      (import.meta as any).env?.VITE_SLACK_EVENTS_CHANNEL ||
      '',
  },
  demoMode: window.TRACKER_CONFIG?.demoMode,
  buyMeCoffeeUrl: window.TRACKER_CONFIG?.buyMeCoffeeUrl,
  api: {
    baseUrl:
      (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1alpha1',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getJiraCreateUrl(summary: string, description?: string): string {
  const params = new URLSearchParams({ summary })
  if (description) params.append('description', description)
  if (config.jira.projectKey) params.append('pid', config.jira.projectKey)
  return `https://${config.jira.domain}/secure/CreateIssue.jspa?${params.toString()}`
}

export function getJiraTicketUrl(ticketKey: string): string {
  if (ticketKey.startsWith('http://') || ticketKey.startsWith('https://')) {
    return ticketKey
  }
  return `https://${config.jira.domain}/browse/${ticketKey}`
}

export function getSlackMessageUrl(channelId: string, messageTs: string): string {
  const formattedTs = messageTs.replace('.', '')
  return `https://${config.slack.workspace}.slack.com/archives/${channelId}/p${formattedTs}`
}

export function parseSlackId(slackId: string): { channelId: string; messageTs: string } | null {
  const match = slackId.match(/^([A-Z0-9]+)[-/](.+)$/)
  if (match) return { channelId: match[1], messageTs: match[2] }
  return null
}

export function getSlackEventsChannelUrl(): string | null {
  if (!config.slack.eventsChannel) return null
  return `https://${config.slack.workspace}.slack.com/archives/${config.slack.eventsChannel}`
}

export function getLinksConfig(): LinkGroup[] {
  if (window.TRACKER_CONFIG?.links) return window.TRACKER_CONFIG.links
  const raw = (import.meta as any).env?.VITE_LINKS
  if (raw) {
    try { return JSON.parse(raw) as LinkGroup[] } catch { /* ignore */ }
  }
  return []
}

export function getHomerUrl(): string | null {
  const url =
    window.TRACKER_CONFIG?.homerUrl ||
    (import.meta as any).env?.VITE_HOMER_URL ||
    null
  return url && url !== '' ? url : null
}
