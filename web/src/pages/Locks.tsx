import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, type Lock } from '../lib/api'
import { Lock as LockIcon, Unlock, Plus, RefreshCw, AlertCircle, Eye } from 'lucide-react'
import { getEnvironmentColor, getEnvironmentLabel } from '../lib/eventUtils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'

export default function Locks() {
  const navigate = useNavigate()
  const [locks, setLocks] = useState<Lock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false)
  const [selectedLock, setSelectedLock] = useState<Lock | null>(null)
  const [unlockUser, setUnlockUser] = useState('')
  const [unlockUserError, setUnlockUserError] = useState(false)

  const loadLocks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await locksApi.list()
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

  const handleUnlock = (lock: Lock) => {
    setSelectedLock(lock)
    setShowUnlockPrompt(true)
    setUnlockUser('')
    setUnlockUserError(false)
  }

  const handleUnlockConfirm = async () => {
    if (!unlockUser.trim()) {
      setUnlockUserError(true)
      return
    }

    if (!selectedLock) return

    try {
      setUnlocking(selectedLock.id)
      setShowUnlockPrompt(false)
      await locksApi.unlock(selectedLock.id)
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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Locks</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage deployment and operation locks
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadLocks}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => navigate('/locks/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Lock
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
        {/* Total Locks Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Total Locks</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{locks.length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg"></div>
                <LockIcon className="relative w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Unique Services Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-orange-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Unique Services</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {new Set(locks.map(l => l.service)).size}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg"></div>
                <AlertCircle className="relative w-12 h-12 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Environments Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Environments</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {new Set(locks.map(l => l.environment)).size}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg"></div>
                <Unlock className="relative w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
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
          <Button
            onClick={() => navigate('/locks/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Lock
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Environnement
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Locked By
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="hidden 2xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary">
                        {getEnvironmentLabel(lock.environment)}
                      </Badge>
                    </td>
                    <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {lock.resource || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {lock.who}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate((lock as any).createdAt || lock.created_at)}
                      </span>
                    </td>
                    <td className="hidden 2xl:table-cell px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary">
                        {getTimeSince((lock as any).createdAt || lock.created_at)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lock.event_id && (
                          <Button
                            onClick={() => navigate(`/events/timeline?event=${lock.event_id}`)}
                            variant="ghost"
                            size="sm"
                            title="View linked event"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Event
                          </Button>
                        )}
                        <Button
                          onClick={() => handleUnlock(lock)}
                          disabled={unlocking === lock.id}
                          variant="destructive"
                          size="sm"
                          title="Unlock service"
                        >
                          {unlocking === lock.id ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4 mr-1" />
                          )}
                          Unlock
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Unlock User Prompt */}
      {showUnlockPrompt && selectedLock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowUnlockPrompt(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Unlock Service
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your name to unlock <span className="font-semibold">{selectedLock.service}</span> in <span className="font-semibold">{getEnvironmentLabel(selectedLock.environment)}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={unlockUser}
                  onChange={(e) => {
                    setUnlockUser(e.target.value)
                    setUnlockUserError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUnlockConfirm()
                    }
                  }}
                  placeholder="e.g., john.doe"
                  className={unlockUserError ? 'border-red-500' : ''}
                  autoFocus
                />
                {unlockUserError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Name is required
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUnlockPrompt(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUnlockConfirm}
                  disabled={unlocking === selectedLock.id}
                  className="flex-1"
                >
                  {unlocking === selectedLock.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
