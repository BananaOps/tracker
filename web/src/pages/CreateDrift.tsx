import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { TrendingDown } from 'lucide-react'

export default function CreateDrift() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'drift_detection',
      type: EventType.DRIFT,
      priority: Priority.P2,
      service: '',
      status: Status.OPEN,
      environment: Environment.PRODUCTION,
      impact: false,
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/drifts')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <TrendingDown className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Créer un Drift</h2>
          <p className="mt-1 text-sm text-gray-500">Enregistrer une dérive de configuration détectée</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <TrendingDown className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Qu'est-ce qu'un drift ?</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Un drift est une dérive de configuration détectée entre l'état attendu et l'état réel d'une ressource.
                Cela peut être une modification manuelle, une mise à jour non planifiée, ou une divergence de configuration.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre du drift <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Drift détecté sur la configuration du load balancer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service concerné <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input"
              value={formData.attributes.service}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, service: e.target.value }
              })}
              placeholder="Ex: load-balancer, database, api-gateway"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Environnement</label>
            <select
              className="select"
              value={formData.attributes.environment}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, environment: Number(e.target.value) as Environment }
              })}
            >
              <option value={Environment.DEVELOPMENT}>Development</option>
              <option value={Environment.INTEGRATION}>Integration</option>
              <option value={Environment.UAT}>UAT</option>
              <option value={Environment.RECETTE}>Recette</option>
              <option value={Environment.PREPRODUCTION}>Preproduction</option>
              <option value={Environment.PRODUCTION}>Production</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
            <select
              className="select"
              value={formData.attributes.priority}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, priority: Number(e.target.value) as Priority }
              })}
            >
              <option value={Priority.P1}>P1 - Critique (impact production)</option>
              <option value={Priority.P2}>P2 - Élevée (à corriger rapidement)</option>
              <option value={Priority.P3}>P3 - Moyenne</option>
              <option value={Priority.P4}>P4 - Faible</option>
              <option value={Priority.P5}>P5 - Très faible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              className="select"
              value={formData.attributes.status}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, status: Number(e.target.value) as Status }
              })}
            >
              <option value={Status.OPEN}>Ouvert (détecté)</option>
              <option value={Status.START}>En cours de correction</option>
              <option value={Status.DONE}>Résolu</option>
              <option value={Status.CLOSE}>Fermé</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source de détection <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.attributes.source}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, source: e.target.value }
            })}
            placeholder="Ex: terraform_drift, cloudformation_drift, manual_detection"
          />
          <p className="text-xs text-gray-500 mt-1">
            Outil ou méthode ayant détecté le drift (terraform, cloudformation, script custom, etc.)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description du drift <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            className="input"
            value={formData.attributes.message}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, message: e.target.value }
            })}
            placeholder="Décrivez la dérive détectée : quelle configuration a changé, quelle est la différence entre l'état attendu et l'état réel..."
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.attributes.impact || false}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, impact: e.target.checked }
              })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Ce drift a un impact sur le service
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Cochez si le drift affecte le fonctionnement du service ou la sécurité
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Owner / Responsable</label>
          <input
            type="text"
            className="input"
            value={formData.attributes.owner || ''}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, owner: e.target.value }
            })}
            placeholder="Ex: team-platform, john.doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket associé</label>
          <input
            type="text"
            className="input"
            value={formData.links?.ticket || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, ticket: e.target.value }
            })}
            placeholder="Ex: JIRA-1234, DRIFT-567"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/drifts')}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            <TrendingDown className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Création...' : 'Créer le drift'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
