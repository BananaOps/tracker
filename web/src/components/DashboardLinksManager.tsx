import { useState } from 'react'
import { DashboardType, type DashboardLink } from '../types/api'
import { Plus, Trash2, BarChart3, Activity } from 'lucide-react'

interface DashboardLinksManagerProps {
  dashboards: DashboardLink[]
  onChange: (dashboards: DashboardLink[]) => void
}

export default function DashboardLinksManager({ 
  dashboards, 
  onChange 
}: DashboardLinksManagerProps) {
  const [newDashboard, setNewDashboard] = useState<Partial<DashboardLink>>({
    type: DashboardType.GRAFANA,
    name: '',
    url: '',
    description: ''
  })

  const addDashboard = () => {
    if (!newDashboard.name || !newDashboard.url || !newDashboard.type) return

    const dashboard: DashboardLink = {
      type: newDashboard.type,
      name: newDashboard.name,
      url: newDashboard.url,
      description: newDashboard.description || ''
    }

    onChange([...dashboards, dashboard])
    setNewDashboard({
      type: DashboardType.GRAFANA,
      name: '',
      url: '',
      description: ''
    })
  }

  const removeDashboard = (index: number) => {
    onChange(dashboards.filter((_, i) => i !== index))
  }

  const getDashboardIcon = (type: DashboardType) => {
    switch (type) {
      case DashboardType.GRAFANA:
      case DashboardType.PROMETHEUS:
      case DashboardType.KIBANA:
        return <BarChart3 className="w-4 h-4" />
      case DashboardType.DATADOG:
      case DashboardType.NEWRELIC:
      case DashboardType.DYNATRACE:
      case DashboardType.APPDYNAMICS:
        return <Activity className="w-4 h-4" />
      default:
        return <BarChart3 className="w-4 h-4" />
    }
  }

  const getDashboardColor = (type: DashboardType): string => {
    switch (type) {
      case DashboardType.GRAFANA:
        return 'bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100 border border-orange-300 dark:border-orange-600'
      case DashboardType.DATADOG:
        return 'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100 border border-purple-300 dark:border-purple-600'
      case DashboardType.NEWRELIC:
        return 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100 border border-green-300 dark:border-green-600'
      case DashboardType.PROMETHEUS:
        return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 border border-red-300 dark:border-red-600'
      case DashboardType.KIBANA:
        return 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-600'
      case DashboardType.SPLUNK:
        return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
      case DashboardType.DYNATRACE:
        return 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 border border-blue-300 dark:border-blue-600'
      case DashboardType.APPDYNAMICS:
        return 'bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100 border border-indigo-300 dark:border-indigo-600'
      case DashboardType.CUSTOM:
        return 'bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100 border border-teal-300 dark:border-teal-600'
      default:
        return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
    }
  }

  const getDashboardLabel = (type: DashboardType): string => {
    switch (type) {
      case DashboardType.GRAFANA:
        return 'Grafana'
      case DashboardType.DATADOG:
        return 'Datadog'
      case DashboardType.NEWRELIC:
        return 'New Relic'
      case DashboardType.PROMETHEUS:
        return 'Prometheus'
      case DashboardType.KIBANA:
        return 'Kibana'
      case DashboardType.SPLUNK:
        return 'Splunk'
      case DashboardType.DYNATRACE:
        return 'Dynatrace'
      case DashboardType.APPDYNAMICS:
        return 'AppDynamics'
      case DashboardType.CUSTOM:
        return 'Custom'
      default:
        return 'Dashboard'
    }
  }

  const getPlaceholderUrl = (type: DashboardType): string => {
    switch (type) {
      case DashboardType.GRAFANA:
        return 'https://grafana.company.com/d/dashboard-id'
      case DashboardType.DATADOG:
        return 'https://app.datadoghq.com/dashboard/dashboard-id'
      case DashboardType.NEWRELIC:
        return 'https://one.newrelic.com/dashboards/dashboard-id'
      case DashboardType.PROMETHEUS:
        return 'https://prometheus.company.com/graph'
      case DashboardType.KIBANA:
        return 'https://kibana.company.com/app/dashboards/dashboard-id'
      case DashboardType.SPLUNK:
        return 'https://splunk.company.com/en-US/app/search/dashboard'
      case DashboardType.DYNATRACE:
        return 'https://company.dynatrace.com/ui/dashboards/dashboard-id'
      case DashboardType.APPDYNAMICS:
        return 'https://company.saas.appdynamics.com/controller/#/location=DASHBOARD'
      case DashboardType.CUSTOM:
        return 'https://monitoring.company.com/dashboard'
      default:
        return 'https://...'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Dashboard Links</span>
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add monitoring and observability dashboard links (Grafana, Datadog, New Relic, etc.)
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Existing Dashboards */}
        {dashboards.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Dashboards</label>
            <div className="space-y-2">
              {dashboards.map((dashboard, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDashboardColor(dashboard.type)}`}>
                      <div className="flex items-center space-x-1">
                        {getDashboardIcon(dashboard.type)}
                        <span>{getDashboardLabel(dashboard.type)}</span>
                      </div>
                    </span>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{dashboard.name}</div>
                      {dashboard.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{dashboard.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={dashboard.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => removeDashboard(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Dashboard */}
        <div className="space-y-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add New Dashboard</label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="dashboard-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <select
                id="dashboard-type"
                value={newDashboard.type}
                onChange={(e) => setNewDashboard(prev => ({ 
                  ...prev, 
                  type: e.target.value as DashboardType,
                  url: '' // Reset URL when type changes
                }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={DashboardType.GRAFANA}>Grafana</option>
                <option value={DashboardType.DATADOG}>Datadog</option>
                <option value={DashboardType.NEWRELIC}>New Relic</option>
                <option value={DashboardType.PROMETHEUS}>Prometheus</option>
                <option value={DashboardType.KIBANA}>Kibana</option>
                <option value={DashboardType.SPLUNK}>Splunk</option>
                <option value={DashboardType.DYNATRACE}>Dynatrace</option>
                <option value={DashboardType.APPDYNAMICS}>AppDynamics</option>
                <option value={DashboardType.CUSTOM}>Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="dashboard-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                type="text"
                id="dashboard-name"
                placeholder="e.g., Service Overview, Performance Metrics"
                value={newDashboard.name}
                onChange={(e) => setNewDashboard(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dashboard-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
            <input
              type="url"
              id="dashboard-url"
              placeholder={getPlaceholderUrl(newDashboard.type || DashboardType.GRAFANA)}
              value={newDashboard.url}
              onChange={(e) => setNewDashboard(prev => ({ ...prev, url: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dashboard-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <input
              type="text"
              id="dashboard-description"
              placeholder="Brief description of this dashboard"
              value={newDashboard.description}
              onChange={(e) => setNewDashboard(prev => ({ ...prev, description: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <button
            onClick={addDashboard}
            disabled={!newDashboard.name || !newDashboard.url || !newDashboard.type}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
