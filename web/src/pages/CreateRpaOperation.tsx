import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { Activity, Bot } from 'lucide-react'

export default function CreateRpaOperation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'rpa_automation',
      type: EventType.OPERATION,
      priority: Priority.P3,
      service: '',
      status: Status.START,
      environment: Environment.PRODUCTION,
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/rpa')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Activity className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Créer une opération RPA</h2>
          <p className="mt-1 text-sm text-gray-500">Enregistrer une opération d'automatisation RPA</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start">
            <Bot className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-purple-800">Qu'est-ce qu'une opération RPA ?</h3>
              <p className="text-sm text-purple-700 mt-1">
                RPA (Robotic Process Automation) désigne l'automatisation de processus métier répétitifs.
                Utilisez cette page pour tracker les exécutions de vos robots, scripts d'automatisation, ou workflows automatisés.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom de l'opération <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Traitement automatique des factures, Synchronisation des données clients"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service / Robot RPA <span className="text-red-500">*</span>
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
              placeholder="Ex: rpa-invoice-processor, rpa-data-sync"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nom du robot ou du service RPA
            </p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut de l'opération</label>
            <select
              className="select"
              value={formData.attributes.status}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, status: Number(e.target.value) as Status }
              })}
            >
              <option value={Status.START}>Démarré</option>
              <option value={Status.SUCCESS}>Succès</option>
              <option value={Status.FAILURE}>Échec</option>
              <option value={Status.WARNING}>Avertissement</option>
              <option value={Status.ERROR}>Erreur</option>
              <option value={Status.DONE}>Terminé</option>
            </select>
          </div>

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
              <option value={Priority.P1}>P1 - Critique</option>
              <option value={Priority.P2}>P2 - Élevée</option>
              <option value={Priority.P3}>P3 - Moyenne</option>
              <option value={Priority.P4}>P4 - Faible</option>
              <option value={Priority.P5}>P5 - Très faible</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source / Plateforme RPA <span className="text-red-500">*</span>
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
            placeholder="Ex: uipath, automation_anywhere, blue_prism, custom_script"
          />
          <p className="text-xs text-gray-500 mt-1">
            Plateforme ou outil utilisé pour l'automatisation
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description de l'opération <span className="text-red-500">*</span>
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
            placeholder="Décrivez l'opération effectuée : nombre d'éléments traités, durée, résultats, erreurs éventuelles..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
            <input
              type="datetime-local"
              className="input"
              value={formData.attributes.startDate || ''}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, startDate: e.target.value }
              })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="datetime-local"
              className="input"
              value={formData.attributes.endDate || ''}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, endDate: e.target.value }
              })}
            />
          </div>
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
            placeholder="Ex: team-automation, rpa-team"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parties prenantes (séparées par des virgules)
          </label>
          <input
            type="text"
            className="input"
            value={formData.attributes.stakeHolders?.join(', ') || ''}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { 
                ...formData.attributes, 
                stakeHolders: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
              }
            })}
            placeholder="Ex: finance-team, operations-team"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket / Référence</label>
          <input
            type="text"
            className="input"
            value={formData.links?.ticket || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, ticket: e.target.value }
            })}
            placeholder="Ex: RPA-1234, AUTO-567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lien vers les logs / dashboard</label>
          <input
            type="url"
            className="input"
            value={formData.links?.pullRequestLink || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, pullRequestLink: e.target.value }
            })}
            placeholder="https://dashboard.rpa.example.com/execution/12345"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/rpa')}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Création...' : 'Créer l\'opération RPA'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

