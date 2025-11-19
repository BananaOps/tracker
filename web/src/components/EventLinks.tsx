import type { EventLinks as EventLinksType } from '../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faSlack, faJira } from '@fortawesome/free-brands-svg-icons'

interface EventLinksProps {
  links?: EventLinksType
  source?: string
  slackId?: string
  className?: string
}

export default function EventLinks({ links, className = '' }: EventLinksProps) {
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
          className="inline-flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title={`Voir la Pull Request: ${links.pullRequestLink}`}
        >
          <FontAwesomeIcon icon={faGithub} className="w-4 h-4 text-gray-800 dark:text-gray-300" />
          <span>PR #{extractPRNumber(links.pullRequestLink)}</span>
        </a>
      )}

      {/* Ticket Link (Jira) - même style que GitHub */}
      {links?.ticket && (() => {
        const ticketId = extractTicketId(links.ticket)
        const ticketUrl = getTicketUrl(ticketId)
        console.log('Rendering Jira ticket:', links.ticket, '→ ID:', ticketId, 'URL:', ticketUrl)
        return (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title={`Voir le ticket: ${ticketId}`}
          >
            <FontAwesomeIcon icon={faJira} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{ticketId}</span>
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

// Helper pour extraire l'ID du ticket Jira depuis une URL ou un texte
function extractTicketId(ticketOrUrl: string): string {
  // Si c'est déjà au format PROJECT-123, le retourner tel quel
  if (/^[A-Z]+-\d+$/.test(ticketOrUrl)) {
    return ticketOrUrl
  }
  
  // Extraire depuis une URL Jira comme:
  // https://jira.company.com/browse/PROJECT-123
  // https://company.atlassian.net/browse/PROJECT-123
  const urlMatch = ticketOrUrl.match(/\/browse\/([A-Z]+-\d+)/)
  if (urlMatch) {
    return urlMatch[1]
  }
  
  // Chercher un pattern PROJECT-123 n'importe où dans le texte
  const textMatch = ticketOrUrl.match(/([A-Z]+-\d+)/)
  if (textMatch) {
    return textMatch[1]
  }
  
  // Si rien ne correspond, retourner le texte original
  return ticketOrUrl
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
  
  if (isJiraTicket(ticket)) {
    const jiraBaseUrl = (import.meta as any).env?.VITE_JIRA_URL || 'https://jira.company.com'
    const url = `${jiraBaseUrl}/browse/${ticket}`
    console.log('getTicketUrl - Generated URL:', url)
    return url
  }
  // Pour les autres types de tickets, retourner un lien de recherche
  console.log('getTicketUrl - Not a Jira ticket, using fallback')
  return `#ticket-${ticket}`
}

// Composant pour afficher l'icône de source
interface SourceIconProps {
  source: string
  className?: string
}

export function SourceIcon({ source, className = 'w-4 h-4' }: SourceIconProps) {
  const sourceLower = source.toLowerCase()

  if (sourceLower.includes('slack')) {
    return <FontAwesomeIcon icon={faSlack} className={`${className} text-purple-600 dark:text-purple-400`} />
  }

  if (sourceLower.includes('github')) {
    return <FontAwesomeIcon icon={faGithub} className={`${className} text-gray-800 dark:text-gray-300`} />
  }

  if (sourceLower.includes('jira')) {
    return <FontAwesomeIcon icon={faJira} className={`${className} text-blue-600 dark:text-blue-400`} />
  }

  return null
}
