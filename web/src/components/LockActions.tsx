import { useState } from 'react'
import { Lock, Unlock, AlertCircle } from 'lucide-react'
import { locksApi } from '../lib/api'

interface LockActionsProps {
  service: string
  environment: string
  resource?: string
  eventId?: string
  isLocked?: boolean
  lockId?: string
  onLockChange?: () => void
}

export default function LockActions({
  service,
  environment,
  resource,
  eventId,
  isLocked = false,
  lockId,
  onLockChange,
}: LockActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLock = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const who = prompt('Qui verrouille ce service ?', 'user')
      if (!who) return

      await locksApi.create({
        service,
        environment,
        resource,
        event_id: eventId,
        who,
      })

      onLockChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du verrouillage')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!lockId) return
    
    if (!confirm('Êtes-vous sûr de vouloir déverrouiller ce service ?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await locksApi.unlock(lockId)
      onLockChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du déverrouillage')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 p-2 text-sm text-red-800 bg-red-50 rounded dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      {isLocked ? (
        <button
          onClick={handleUnlock}
          disabled={loading || !lockId}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          Déverrouiller
        </button>
      ) : (
        <button
          onClick={handleLock}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Verrouiller
        </button>
      )}
    </div>
  )
}
