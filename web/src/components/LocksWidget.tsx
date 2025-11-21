import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { locksApi, type Lock as LockType } from '../lib/api'

export default function LocksWidget() {
  const navigate = useNavigate()
  const [locks, setLocks] = useState<LockType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLocks = async () => {
      try {
        const data = await locksApi.list()
        setLocks(data.locks || [])
      } catch (err) {
        console.error('Failed to load locks:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLocks()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Locks</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const uniqueServices = new Set(locks.map(l => l.service)).size
  const uniqueEnvironments = new Set(locks.map(l => l.environment)).size

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${locks.length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Lock className={`w-5 h-5 ${locks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Locks</h3>
        </div>
        <button
          onClick={() => navigate('/locks')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {locks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active locks
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            All services are unlocked
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{locks.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Locks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{uniqueServices}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Services</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{uniqueEnvironments}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Environments</p>
            </div>
          </div>

          {locks.length > 3 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-300">
                Multiple services are locked. Review and unlock when possible.
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {locks.slice(0, 5).map((lock) => (
              <div
                key={lock.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {lock.service}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lock.environment} • {lock.who}
                  </p>
                </div>
                <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
              </div>
            ))}
          </div>

          {locks.length > 5 && (
            <button
              onClick={() => navigate('/locks')}
              className="w-full text-sm text-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              +{locks.length - 5} more locks
            </button>
          )}
        </div>
      )}
    </div>
  )
}
