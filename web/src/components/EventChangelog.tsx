import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Clock, 
  Edit, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Link as LinkIcon,
  Plus,
  GitBranch
} from 'lucide-react'
import type { ChangelogEntry, ChangeType } from '../types/api'

interface EventChangelogProps {
  changelog?: ChangelogEntry[]
}

const getChangeIcon = (changeType: ChangeType | string) => {
  const type = String(changeType).toLowerCase()
  switch (type) {
    case 'created':
      return <Plus className="w-4 h-4 text-green-600" />
    case 'updated':
      return <Edit className="w-4 h-4 text-blue-600" />
    case 'status_changed':
      return <GitBranch className="w-4 h-4 text-purple-600" />
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-600" />
    case 'commented':
      return <MessageSquare className="w-4 h-4 text-gray-600" />
    case 'linked':
      return <LinkIcon className="w-4 h-4 text-blue-600" />
    default:
      return <Clock className="w-4 h-4 text-gray-600" />
  }
}

const getChangeLabel = (changeType: ChangeType | string) => {
  const type = String(changeType).toLowerCase()
  const labels: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    status_changed: 'Status Changed',
    approved: 'Approved',
    rejected: 'Rejected',
    commented: 'Commented',
    linked: 'Linked',
  }
  return labels[type] || type
}

const getChangeBadgeColor = (changeType: ChangeType | string) => {
  const type = String(changeType).toLowerCase()
  switch (type) {
    case 'created':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'updated':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'status_changed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'commented':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    case 'linked':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function EventChangelog({ changelog }: EventChangelogProps) {
  if (!changelog || changelog.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No change history available
      </div>
    )
  }

  // Trier par date décroissante (plus récent en premier)
  const sortedChangelog = [...changelog].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="space-y-3">
      {sortedChangelog.map((entry, index) => (
        <div 
          key={index} 
          className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getChangeIcon(entry.changeType)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getChangeBadgeColor(entry.changeType)}`}>
                {getChangeLabel(entry.changeType)}
              </span>
              {entry.user && (
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.user}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(entry.timestamp), 'PPp', { locale: fr })}
              </span>
            </div>

            {/* Field change */}
            {entry.field && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                <span className="font-medium">{entry.field}</span>
                {entry.oldValue && entry.newValue && (
                  <span className="ml-2">
                    <span className="text-red-600 dark:text-red-400 line-through">{entry.oldValue}</span>
                    {' → '}
                    <span className="text-green-600 dark:text-green-400">{entry.newValue}</span>
                  </span>
                )}
              </div>
            )}

            {/* Comment */}
            {entry.comment && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                "{entry.comment}"
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
