import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWrench, faRobot } from '@fortawesome/free-solid-svg-icons'

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
        <FontAwesomeIcon icon={faWrench} className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create RPA Operation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register an RPA automation operation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-purple-800">What is an RPA operation?</h3>
              <p className="text-sm text-purple-700 mt-1">
                RPA (Robotic Process Automation) refers to the automation of repetitive business processes.
                Use this page to track executions of your robots, automation scripts, or automated workflows.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Operation Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Automatic invoice processing, Customer data synchronization"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service / RPA Robot <span className="text-red-500">*</span>
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
              Name of the robot or RPA service
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operation Status</label>
            <select
              className="select"
              value={formData.attributes.status}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, status: Number(e.target.value) as Status }
              })}
            >
              <option value={Status.START}>Started</option>
              <option value={Status.SUCCESS}>Success</option>
              <option value={Status.FAILURE}>Failure</option>
              <option value={Status.WARNING}>Warning</option>
              <option value={Status.ERROR}>Error</option>
              <option value={Status.DONE}>Done</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select
              className="select"
              value={formData.attributes.priority}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, priority: Number(e.target.value) as Priority }
              })}
            >
              <option value={Priority.P1}>P1 - Critical</option>
              <option value={Priority.P2}>P2 - High</option>
              <option value={Priority.P3}>P3 - Medium</option>
              <option value={Priority.P4}>P4 - Low</option>
              <option value={Priority.P5}>P5 - Very Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source / RPA Platform <span className="text-red-500">*</span>
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
            Platform or tool used for automation
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Operation Description <span className="text-red-500">*</span>
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
            placeholder="Describe the operation performed: number of items processed, duration, results, any errors..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner / Responsible</label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stakeholders (comma separated)
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ticket / Reference</label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link to logs / dashboard</label>
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faWrench} className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Creating...' : 'Create RPA Operation'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

