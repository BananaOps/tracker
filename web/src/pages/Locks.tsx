import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, type Lock } from '../lib/api'
import { Lock as LockIcon, Unlock, Trash2, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { getEnvironmentColor, getEnvironmentLabel } from '../lib/eventUtils'

export default function Locks() {
  const navigate = useNavigate()
  const [locks, setLocks] = useState<Lock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)

  const loadLocks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await locksApi.list()
      console.log('Locks data:', data)
      setLocks(data.locks || [])
    } catch (err) {
      setError('Erreur lors du chargement des locks')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocks()
  }, [])

  const handleUnlock = async (id: string) => {
    if (!confirm('Are you sure you want to unlock this service?')) {
      return
    }

    try {
      setUnlocking(id)
      await locksApi.unlock(id)
      await loadLocks()
    } catch (err) {
      alert('Error unlocking service')
      console.error(err)
    } finally {
      setUnlocking(null)
    }
  }

  // Convertit un timestamp protobuf ou une string en Date
  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null
    
    // Si c'est déjà une string ISO
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp)
      return isNaN(date.getTime()) ? null : date
    }
    
    // Si c'est un objet protobuf {seconds, nanos}
    if (timestamp.seconds !== undefined) {
      const milliseconds = Number(timestamp.seconds) * 1000 + (timestamp.nanos || 0) / 1000000
      return new Date(milliseconds)
    }
    
    return null
  }

  const formatDate = (timestamp: any) => {
    const date = parseTimestamp(timestamp)
    if (!date) return '-'
    
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    } catch (err) {
      console.error('Error formatting date:', timestamp, err)
      return '-'
    }
  }

  const getTimeSince = (timestamp: any) => {
    const created = parseTimestamp(timestamp)
    if (!created) return '-'
    
    try {
      const now = new Date()
      const diffMs = now.getTime() - created.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return '< 1m'
      if (diffMins < 60) return `${diffMins}m`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}j`
    } catch (err) {
      console.error('Error calculating time since:', timestamp, err)
      return '-'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Locks</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage deployment and operation locks
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadLocks}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/locks/create')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Lock
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Locks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{locks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Services</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(locks.map(l => l.service)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Unlock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Environments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(locks.map(l => l.environment)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {locks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Unlock className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No active locks
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            All services are currently unlocked
          </p>
          <button
            onClick={() => navigate('/locks/create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Lock
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Environnement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Locked By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Locked For
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {locks.map((lock) => (
                  <tr key={lock.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <LockIcon className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {lock.service}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(lock.environment).bg} ${getEnvironmentColor(lock.environment).text}`}>
                        {getEnvironmentLabel(lock.environment)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {lock.resource || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {lock.who}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate((lock as any).createdAt || lock.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {getTimeSince((lock as any).createdAt || lock.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lock.event_id && (
                          <button
                            onClick={() => navigate(`/events/timeline?event=${lock.event_id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View event"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleUnlock(lock.id)}
                          disabled={unlocking === lock.id}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Unlock"
                        >
                          {unlocking === lock.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                          Unlock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
