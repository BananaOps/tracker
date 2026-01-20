import type { EventLinks as EventLinksType } from '../types/api'
import { Github, ExternalLink } from 'lucide-react'
import { SlackIcon } from './icons/SlackIcon'
import { GrafanaIcon } from './icons/GrafanaIcon'
import { getJiraTicketUrl, getSlackMessageUrl, parseSlackId } from '../config'

interface EventLinksProps {
  links?: EventLinksType
  source?: string
  slackId?: string
  className?: string
}

export default function EventLinks({ links, slackId, className = '' }: EventLinksProps) {
  const hasLinks = links?.pullRequestLink || links?.ticket || slackId
  
  if (!hasLinks) {
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
          <Github className="w-4 h-4" />
          <span>PR #{extractPRNumber(links.pullRequestLink)}</span>
        </a>
      )}

      {/* Ticket Link (Jira) */}
      {links?.ticket && (() => {
        const ticketId = extractTicketId(links.ticket)
        const ticketUrl = getJiraTicketUrl(links.ticket)
        return (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title={`View ticket: ${ticketId}`}
          >
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{ticketId}</span>
          </a>
        )
      })()}

      {/* Slack Link */}
      {slackId && (() => {
        const parsed = parseSlackId(slackId)
        if (parsed) {
          const slackUrl = getSlackMessageUrl(parsed.channelId, parsed.messageTs)
          return (
            <a
              href={slackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="View in Slack"
            >
              <SlackIcon className="w-4 h-4" />
              <span>Slack</span>
            </a>
          )
        }
        return null
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



// Composant pour afficher l'icône de source
interface SourceIconProps {
  source: string
  className?: string
}

export function SourceIcon({ source, className = 'w-4 h-4' }: SourceIconProps) {
  const sourceLower = source.toLowerCase()

  if (sourceLower.includes('tracker')) {
    return (
      <div className={className}>
        <img src="/tracker-icon.svg" alt="Tracker" className="w-full h-full" />
      </div>
    )
  }

  if (sourceLower.includes('slack')) {
    return <SlackIcon className={className} />
  }

  if (sourceLower.includes('github')) {
    return <Github className={className} />
  }

  if (sourceLower.includes('grafana')) {
    return <GrafanaIcon className={className} />
  }

  return <ExternalLink className={className} />
}
