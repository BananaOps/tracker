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
  }
}

export const config = {
  ...getConfig(),
  api: {
    baseUrl: (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1alpha1',
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
