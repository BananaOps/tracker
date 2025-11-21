import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi } from '../lib/api'
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react'

export default function CreateLock() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    service: '',
    who: '',
    environment: '',
    resource: '',
    event_id: '',
  })

  const environments = [
    'development',
    'integration',
    'tnr',
    'uat',
    'recette',
    'preproduction',
    'production',
    'mco',
  ]

  const resources = [
    'deployment',
    'operation',
    'maintenance',
    'migration',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.service || !formData.who || !formData.environment) {
      setError('Les champs Service, Qui et Environnement sont obligatoires')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await locksApi.create({
        service: formData.service,
        who: formData.who,
        environment: formData.environment,
        resource: formData.resource || undefined,
        event_id: formData.event_id || undefined,
      })
      
      navigate('/locks')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du lock')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/locks')}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Créer un Lock</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Verrouiller un service pour empêcher les déploiements concurrents
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Service <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            placeholder="ex: api-gateway, user-service"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Verrouillé par <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.who}
            onChange={(e) => setFormData({ ...formData, who: e.target.value })}
            placeholder="ex: john.doe, team-platform"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Environnement <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          >
            <option value="">Sélectionner un environnement</option>
            {environments.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource
          </label>
          <select
            value={formData.resource}
            onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Sélectionner une resource (optionnel)</option>
            {resources.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Type de resource à verrouiller (optionnel)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event ID
          </label>
          <input
            type="text"
            value={formData.event_id}
            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
            placeholder="ex: 123e4567-e89b-12d3-a456-426614174000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ID de l'événement associé (optionnel)
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/locks')}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Créer le lock
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

