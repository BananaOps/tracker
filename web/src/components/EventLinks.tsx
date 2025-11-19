import type { EventLinks as EventLinksType } from '../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faSlack, faJira } from '@fortawesome/free-brands-svg-icons'

interface EventLinksProps {
  links?: EventLinksType
  source?: string
  slackId?: string
  className?: string
}

export default function EventLinks({ links, source, slackId, className = '' }: EventLinksProps) {
  const hasLinks = links?.pullRequestLink || links?.ticket
  
  // Debug
  console.log('EventLinks - links:', links)
  console.log('EventLinks - ticket:', links?.ticket)
  console.log('EventLinks - pullRequestLink:', links?.pullRequestLink)
  
  if (!hasLinks) {
    console.log('EventLinks - No links to display')
    return null
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Pull Request Link (GitHub) */}
      {links?.pullRequestLink && (
        <a
          href={links.pullRequestLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          title={`Voir la Pull Request: ${links.pullRequestLink}`}
        >
          <FontAwesomeIcon icon={faGithub} className="w-4 h-4" />
          <span>PR #{extractPRNumber(links.pullRequestLink)}</span>
        </a>
      )}

      {/* Ticket Link (Jira) */}
      {links?.ticket && (() => {
        const ticketUrl = getTicketUrl(links.ticket)
        console.log('Rendering Jira ticket:', links.ticket, 'URL:', ticketUrl)
        return (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            title={`Voir le ticket ${links.ticket}`}
          >
            <FontAwesomeIcon icon={faJira} className="w-4 h-4" />
            <span>{links.ticket}</span>
          </a>
        )
      })()}
    </div>
  )
}

// Helper pour extraire le numéro de PR depuis l'URL GitHub
function extractPRNumber(url: string): string {
  // Extraire le numéro de PR depuis des URLs comme:
  // https://github.com/org/repo/pull/123
  // https://github.com/org/repo/pulls/123
  const match = url.match(/\/pull[s]?\/(\d+)/)
  return match ? match[1] : '?'
}

// Helper pour détecter si c'est un ticket Jira
function isJiraTicket(ticket: string): boolean {
  // Format Jira typique: PROJECT-123
  return /^[A-Z]+-\d+$/.test(ticket)
}

// Helper pour générer l'URL du ticket
function getTicketUrl(ticket: string): string {
  console.log('getTicketUrl - ticket:', ticket)
  console.log('getTicketUrl - isJiraTicket:', isJiraTicket(ticket))
  console.log('getTicketUrl - VITE_JIRA_URL:', import.meta.env.VITE_JIRA_URL)
  
  if (isJiraTicket(ticket)) {
    const jiraBaseUrl = import.meta.env.VITE_JIRA_URL || 'https://energypool.atlassian.net'
    const url = `${jiraBaseUrl}/browse/${ticket}`
    console.log('getTicketUrl - Generated URL:', url)
    return url
  }
  // Pour les autres types de tickets, retourner un lien de recherche
  console.log('getTicketUrl - Not a Jira ticket, using fallback')
  return `#ticket-${ticket}`
}

// Helper pour générer l'URL Slack
function getSlackUrl(slackId: string): string {
  // Format Slack: workspace/channel/message
  const slackWorkspace = import.meta.env.VITE_SLACK_WORKSPACE || 'your-workspace'
  return `https://${slackWorkspace}.slack.com/archives/${slackId}`
}

// Composant pour afficher l'icône de source
interface SourceIconProps {
  source: string
  className?: string
}

export function SourceIcon({ source, className = 'w-4 h-4' }: SourceIconProps) {
  const sourceLower = source.toLowerCase()

  if (sourceLower.includes('slack')) {
    return <FontAwesomeIcon icon={faSlack} className={`${className} text-purple-600`} />
  }

  if (sourceLower.includes('github')) {
    return <FontAwesomeIcon icon={faGithub} className={`${className} text-gray-800`} />
  }

  if (sourceLower.includes('jira')) {
    return <FontAwesomeIcon icon={faJira} className={`${className} text-blue-600`} />
  }

  return null
}
