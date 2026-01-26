import { useState } from 'react'
import { Plus, Database, HardDrive, Network, MessageSquare, Shield, Activity, X, Edit2, Save } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import type { InfrastructureResource, InfrastructureType } from '../types/api'

interface InfrastructureResourceManagerProps {
  resources: InfrastructureResource[]
  onChange: (resources: InfrastructureResource[]) => void
}

export default function InfrastructureResourceManager({ resources, onChange }: InfrastructureResourceManagerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingResource, setEditingResource] = useState<InfrastructureResource | null>(null)
  const [formData, setFormData] = useState<Partial<InfrastructureResource>>({
    name: '',
    type: 'database_postgresql' as InfrastructureType,
    description: '',
    provider: 'AWS',
    region: '',
    endpoint: '',
    metadata: {}
  })

  const handleAdd = () => {
    setEditingResource(null)
    setFormData({
      name: '',
      type: 'database_postgresql' as InfrastructureType,
      description: '',
      provider: 'AWS',
      region: '',
      endpoint: '',
      metadata: {}
    })
    setShowDialog(true)
  }

  const handleEdit = (resource: InfrastructureResource) => {
    setEditingResource(resource)
    setFormData(resource)
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.type) return

    const newResource: InfrastructureResource = {
      id: editingResource?.id || `infra-${Date.now()}`,
      name: formData.name,
      type: formData.type as InfrastructureType,
      description: formData.description || '',
      provider: formData.provider || 'AWS',
      region: formData.region || '',
      endpoint: formData.endpoint || '',
      metadata: formData.metadata || {},
      connectedServices: formData.connectedServices || []
    }

    if (editingResource) {
      onChange(resources.map(r => r.id === editingResource.id ? newResource : r))
    } else {
      onChange([...resources, newResource])
    }

    setShowDialog(false)
  }

  const handleDelete = (id: string) => {
    onChange(resources.filter(r => r.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5" />
              <span>Infrastructure Resources</span>
            </CardTitle>
            <CardDescription>
              Manage databases, storage, load balancers, and other infrastructure components
            </CardDescription>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No infrastructure resources defined</p>
            <p className="text-xs mt-1">Add databases, storage, or other infrastructure components</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resources.map(resource => (
              <div
                key={resource.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getInfrastructureIcon(resource.type)}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {resource.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getInfrastructureTypeLabel(resource.type)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {resource.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {resource.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 text-xs">
                  {resource.provider && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {resource.provider}
                    </span>
                  )}
                  {resource.region && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {resource.region}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Custom Modal */}
      {showDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowDialog(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {editingResource ? 'Edit Infrastructure Resource' : 'Add Infrastructure Resource'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Define a database, storage, load balancer, or other infrastructure component
                  </p>
                </div>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Resource Name *
                      </label>
                      <Input
                        id="name"
                        placeholder="e.g., users-db, assets-bucket"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Type *
                      </label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as InfrastructureType })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                      >
                        <option value="database_postgresql">PostgreSQL Database</option>
                        <option value="database_mysql">MySQL Database</option>
                        <option value="database_mongodb">MongoDB</option>
                        <option value="database_redis">Redis Cache</option>
                        <option value="database_rds">RDS Database</option>
                        <option value="database_dynamodb">DynamoDB</option>
                        <option value="database_elasticsearch">Elasticsearch</option>
                        <option value="storage_s3">S3 / Object Storage</option>
                        <option value="storage_efs">EFS / File Storage</option>
                        <option value="storage_ebs">EBS / Block Storage</option>
                        <option value="network_load_balancer">Load Balancer</option>
                        <option value="network_api_gateway">API Gateway</option>
                        <option value="network_cdn">CDN</option>
                        <option value="network_vpc">VPC / Virtual Network</option>
                        <option value="network_nat_gateway">NAT Gateway</option>
                        <option value="messaging_sqs">SQS / Queue</option>
                        <option value="messaging_sns">SNS / Notification</option>
                        <option value="messaging_kafka">Kafka</option>
                        <option value="messaging_rabbitmq">RabbitMQ</option>
                        <option value="cache_redis">Redis Cache</option>
                        <option value="cache_memcached">Memcached</option>
                        <option value="security_waf">WAF</option>
                        <option value="security_secrets_manager">Secrets Manager</option>
                        <option value="security_kms">KMS / Key Management</option>
                        <option value="monitoring_cloudwatch">CloudWatch</option>
                        <option value="monitoring_prometheus">Prometheus</option>
                        <option value="monitoring_grafana">Grafana</option>
                        <option value="other_custom">Custom Resource</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      id="description"
                      placeholder="Describe the purpose and usage of this resource"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cloud Provider
                      </label>
                      <select
                        id="provider"
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                      >
                        <option value="AWS">AWS</option>
                        <option value="Azure">Azure</option>
                        <option value="GCP">Google Cloud</option>
                        <option value="Scaleway">Scaleway</option>
                        <option value="DigitalOcean">DigitalOcean</option>
                        <option value="On-Premise">On-Premise</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Region
                      </label>
                      <Input
                        id="region"
                        placeholder="e.g., us-east-1, eu-west-1"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Endpoint / URL
                    </label>
                    <Input
                      id="endpoint"
                      placeholder="e.g., db.example.com:5432, https://bucket.s3.amazonaws.com"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.name || !formData.type}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingResource ? 'Update' : 'Add'} Resource
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function getInfrastructureIcon(type: InfrastructureType) {
  const iconClass = "w-5 h-5"
  
  if (type.startsWith('database_')) {
    return <Database className={`${iconClass} text-blue-600`} />
  } else if (type.startsWith('storage_')) {
    return <HardDrive className={`${iconClass} text-green-600`} />
  } else if (type.startsWith('network_')) {
    return <Network className={`${iconClass} text-purple-600`} />
  } else if (type.startsWith('messaging_') || type.startsWith('cache_')) {
    return <MessageSquare className={`${iconClass} text-orange-600`} />
  } else if (type.startsWith('security_')) {
    return <Shield className={`${iconClass} text-red-600`} />
  } else if (type.startsWith('monitoring_')) {
    return <Activity className={`${iconClass} text-indigo-600`} />
  }
  
  return <Network className={`${iconClass} text-gray-600`} />
}

function getInfrastructureTypeLabel(type: InfrastructureType): string {
  const labels: Record<string, string> = {
    'database_postgresql': 'PostgreSQL',
    'database_mysql': 'MySQL',
    'database_mongodb': 'MongoDB',
    'database_redis': 'Redis',
    'database_rds': 'RDS',
    'database_dynamodb': 'DynamoDB',
    'database_elasticsearch': 'Elasticsearch',
    'storage_s3': 'S3 Storage',
    'storage_efs': 'EFS',
    'storage_ebs': 'EBS',
    'network_load_balancer': 'Load Balancer',
    'network_api_gateway': 'API Gateway',
    'network_cdn': 'CDN',
    'network_vpc': 'VPC',
    'network_nat_gateway': 'NAT Gateway',
    'messaging_sqs': 'SQS',
    'messaging_sns': 'SNS',
    'messaging_kafka': 'Kafka',
    'messaging_rabbitmq': 'RabbitMQ',
    'cache_redis': 'Redis Cache',
    'cache_memcached': 'Memcached',
    'security_waf': 'WAF',
    'security_secrets_manager': 'Secrets Manager',
    'security_kms': 'KMS',
    'monitoring_cloudwatch': 'CloudWatch',
    'monitoring_prometheus': 'Prometheus',
    'monitoring_grafana': 'Grafana',
    'other_custom': 'Custom'
  }
  
  return labels[type] || type
}

