import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, type Catalog } from '../types/api'
import { ArrowLeft, Save, Package } from 'lucide-react'

export default function CreateCatalog() {
  const navigate = useNavigate()
  const { name } = useParams()
  const queryClient = useQueryClient()
  const isEditing = Boolean(name)

  // Charger les données existantes si on édite
  const { data: existingCatalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['catalog', name],
    queryFn: () => catalogApi.get(name!),
    enabled: isEditing,
  })

  const [formData, setFormData] = useState<Partial<Catalog>>({
    name: '',
    type: CatalogType.MODULE,
    languages: Language.JAVASCRIPT,
    owner: '',
    version: '',
    link: '',
    description: '',
    repository: '',
  })

  // Mettre à jour le formulaire quand les données sont chargées
  useEffect(() => {
    if (existingCatalog) {
      setFormData(existingCatalog)
    }
  }, [existingCatalog])

  const createUpdateMutation = useMutation({
    mutationFn: (data: Catalog) => catalogApi.createOrUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/catalog')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.owner) return

    createUpdateMutation.mutate(formData as Catalog)
  }

  const handleChange = (field: keyof Catalog, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isEditing && isLoadingCatalog) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/catalog')}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Modifier le service' : 'Ajouter au catalogue'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEditing ? `Modification de ${name}` : 'Créer un nouveau service dans le catalogue'}
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du service */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du service *
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                required
                disabled={isEditing} // Le nom ne peut pas être modifié
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                placeholder="ex: auth-service, payment-api, user-dashboard"
              />
            </div>
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Le nom du service ne peut pas être modifié
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <select
              id="type"
              required
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={CatalogType.MODULE}>Module</option>
              <option value={CatalogType.LIBRARY}>Library</option>
              <option value={CatalogType.WORKFLOW}>Workflow</option>
              <option value={CatalogType.PROJECT}>Projet</option>
              <option value={CatalogType.CHART}>Chart</option>
              <option value={CatalogType.PACKAGE}>Package</option>
              <option value={CatalogType.CONTAINER}>Container</option>
            </select>
          </div>

          {/* Langage */}
          <div>
            <label htmlFor="languages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langage principal *
            </label>
            <select
              id="languages"
              required
              value={formData.languages}
              onChange={(e) => handleChange('languages', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={Language.GOLANG}>Go</option>
              <option value={Language.KOTLIN}>Kotlin</option>
              <option value={Language.JAVA}>Java</option>
              <option value={Language.TERRAFORM}>Terraform</option>
              <option value={Language.HELM}>Helm</option>
              <option value={Language.JAVASCRIPT}>JavaScript</option>
              <option value={Language.TYPESCRIPT}>TypeScript</option>
              <option value={Language.YAML}>YAML</option>
              <option value={Language.DOCKER}>Docker</option>
              <option value={Language.PYTHON}>Python</option>
              <option value={Language.PHP}>PHP</option>
              <option value={Language.RUST}>Rust</option>
              <option value={Language.GROOVY}>Groovy</option>
            </select>
          </div>

          {/* Owner */}
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Propriétaire *
            </label>
            <input
              type="text"
              id="owner"
              required
              value={formData.owner}
              onChange={(e) => handleChange('owner', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="ex: team-backend, john.doe, platform-team"
            />
          </div>

          {/* Version */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Version
            </label>
            <input
              type="text"
              id="version"
              value={formData.version}
              onChange={(e) => handleChange('version', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="ex: v1.2.3, 2.0.0, latest"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Description du service, de son rôle et de ses fonctionnalités..."
            />
          </div>

          {/* Repository */}
          <div>
            <label htmlFor="repository" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository
            </label>
            <input
              type="url"
              id="repository"
              value={formData.repository}
              onChange={(e) => handleChange('repository', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://github.com/organization/repository"
            />
          </div>

          {/* Documentation Link */}
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Documentation
            </label>
            <input
              type="url"
              id="link"
              value={formData.link}
              onChange={(e) => handleChange('link', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://docs.example.com/service"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createUpdateMutation.isPending || !formData.name || !formData.owner}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                {createUpdateMutation.isPending 
                  ? (isEditing ? 'Modification...' : 'Création...') 
                  : (isEditing ? 'Modifier' : 'Créer')
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
