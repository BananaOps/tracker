import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { CatalogType, Language } from '../types/api'
import type { Catalog } from '../types/api'

export default function CreateCatalog() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<Catalog>({
    name: '',
    type: CatalogType.MODULE,
    languages: Language.JAVASCRIPT,
    owner: '',
    version: '',
    description: '',
    repository: '',
    link: '',
  })

  const createMutation = useMutation({
    mutationFn: catalogApi.createOrUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/catalog')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Ajouter au catalogue</h2>
        <p className="mt-1 text-sm text-gray-500">Enregistrer un nouveau module, bibliothèque ou projet</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
          <input
            type="text"
            required
            className="input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: service-api"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              className="select"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CatalogType })}
            >
              <option value={CatalogType.MODULE}>Module</option>
              <option value={CatalogType.LIBRARY}>Bibliothèque</option>
              <option value={CatalogType.WORKFLOW}>Workflow</option>
              <option value={CatalogType.PROJECT}>Projet</option>
              <option value={CatalogType.CHART}>Chart</option>
              <option value={CatalogType.PACKAGE}>Package</option>
              <option value={CatalogType.CONTAINER}>Container</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Langage</label>
            <select
              className="select"
              value={formData.languages}
              onChange={(e) => setFormData({ ...formData, languages: e.target.value as Language })}
            >
              <option value={Language.JAVASCRIPT}>JavaScript</option>
              <option value={Language.TYPESCRIPT}>TypeScript</option>
              <option value={Language.PYTHON}>Python</option>
              <option value={Language.GOLANG}>Go</option>
              <option value={Language.JAVA}>Java</option>
              <option value={Language.KOTLIN}>Kotlin</option>
              <option value={Language.PHP}>PHP</option>
              <option value={Language.RUST}>Rust</option>
              <option value={Language.TERRAFORM}>Terraform</option>
              <option value={Language.HELM}>Helm</option>
              <option value={Language.DOCKER}>Docker</option>
              <option value={Language.YAML}>YAML</option>
              <option value={Language.GROOVY}>Groovy</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
            <input
              type="text"
              required
              className="input"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="Ex: 1.0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
            <input
              type="text"
              required
              className="input"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              placeholder="Ex: team-platform"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            rows={3}
            className="input"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description du module ou projet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Repository (optionnel)</label>
          <input
            type="url"
            className="input"
            value={formData.repository || ''}
            onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
            placeholder="https://github.com/org/repo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Documentation (optionnel)</label>
          <input
            type="url"
            className="input"
            value={formData.link || ''}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            placeholder="https://docs.example.com"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Création...' : 'Ajouter au catalogue'}
          </button>
        </div>
      </form>
    </div>
  )
}
