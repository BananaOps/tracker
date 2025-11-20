// Configuration de l'application
// La configuration est chargée depuis /config.js (injecté par le serveur)
// ou depuis les variables d'environnement pour le développement local

// Déclaration du type pour la config globale
declare global {
  interface Window {
    TRACKER_CONFIG?: {
      jira: {
        domain: string
        projectKey: string
      }
      slack: {
        workspace: string
        eventsChannel: string
      }
    }
  }
}

// Fonction pour obtenir la configuration
function getConfig() {
  // En production, utiliser la config du serveur
  if (window.TRACKER_CONFIG) {
    return window.TRACKER_CONFIG
  }
  
  // En développement, utiliser les variables d'environnement
  return {
    jira: {
      domain: (import.meta as any).env?.VITE_JIRA_DOMAIN || 'your-domain.atlassian.net',
      projectKey: (import.meta as any).env?.VITE_JIRA_PROJECT_KEY || '',
    },
    slack: {
      workspace: (import.meta as any).env?.VITE_SLACK_WORKSPACE || 'your-workspace',
      eventsChannel: (import.meta as any).env?.VITE_SLACK_EVENTS_CHANNEL || '',
    },
  }
}

export const config = {
  ...getConfig(),
  api: {
    baseUrl: (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1alpha1',
  },
  slack: {
    workspace: (import.meta as any).env?.VITE_SLACK_WORKSPACE || 'your-workspace',
    eventsChannel: (import.meta as any).env?.VITE_SLACK_EVENTS_CHANNEL || '',
  },
}

// Fonction helper pour générer l'URL de création de ticket Jira
export function getJiraCreateUrl(summary: string, description?: string): string {
  const params = new URLSearchParams({
    summary,
  })
  
  if (description) {
    params.append('description', description)
  }
  
  if (config.jira.projectKey) {
    params.append('pid', config.jira.projectKey)
  }
  
  return `https://${config.jira.domain}/secure/CreateIssue.jspa?${params.toString()}`
}

// Fonction helper pour générer l'URL d'un ticket Jira
export function getJiraTicketUrl(ticketKey: string): string {
  // Si c'est déjà une URL complète, la retourner telle quelle
  if (ticketKey.startsWith('http://') || ticketKey.startsWith('https://')) {
    return ticketKey
  }
  
  // Sinon, construire l'URL avec le domaine configuré
  return `https://${config.jira.domain}/browse/${ticketKey}`
}

// Fonction helper pour générer l'URL d'un message Slack
export function getSlackMessageUrl(channelId: string, messageTs: string): string {
  // Format: https://workspace.slack.com/archives/CHANNEL_ID/pMESSAGE_TS
  // Le timestamp Slack utilise un format comme "1234567890.123456"
  // Pour l'URL, on remplace le point par 'p'
  const formattedTs = messageTs.replace('.', '')
  return `https://${config.slack.workspace}.slack.com/archives/${channelId}/p${formattedTs}`
}

// Fonction helper pour extraire le channel ID et message TS depuis un slack_id
export function parseSlackId(slackId: string): { channelId: string; messageTs: string } | null {
  // Format attendu: "CHANNEL_ID-TIMESTAMP" ou "CHANNEL_ID/TIMESTAMP"
  const match = slackId.match(/^([A-Z0-9]+)[-/](.+)$/)
  if (match) {
    return {
      channelId: match[1],
      messageTs: match[2],
    }
  }
  return null
}

// Fonction helper pour générer l'URL du canal Slack des événements
export function getSlackEventsChannelUrl(): string | null {
  if (!config.slack.eventsChannel) {
    return null
  }
  return `https://${config.slack.workspace}.slack.com/archives/${config.slack.eventsChannel}`
}
