import { Lock, Unlock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LockIndicatorProps {
  isLocked: boolean
  lockId?: string
  service: string
  environment: string
  onUnlock?: () => void
  compact?: boolean
}

export default function LockIndicator({ 
  isLocked, 
  lockId, 
  service, 
  environment,
  onUnlock,
  compact = false 
}: LockIndicatorProps) {
  const navigate = useNavigate()

  if (!isLocked) {
    return null
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs">
        <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
        <span className="text-red-700 dark:text-red-300 font-medium">Locked</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <Lock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Service verrouillé
        </p>
        <p className="text-xs text-red-600 dark:text-red-400">
          {service} • {environment}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {lockId && onUnlock && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUnlock()
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
            title="Déverrouiller"
          >
            <Unlock className="w-3 h-3" />
            Unlock
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate('/locks')
          }}
          className="text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Voir tous les locks
        </button>
      </div>
    </div>
  )
}
