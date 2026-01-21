import { useState } from 'react'
import { Plus, Database, HardDrive, Network, MessageSquare, Shield, Activity, X, Edit2, Save } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Infrastructure Resource' : 'Add Infrastructure Resource'}
            </DialogTitle>
            <DialogDescription>
              Define a database, storage, load balancer, or other infrastructure component
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Resource Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., users-db, assets-bucket"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as InfrastructureType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database_postgresql">PostgreSQL Database</SelectItem>
                    <SelectItem value="database_mysql">MySQL Database</SelectItem>
                    <SelectItem value="database_mongodb">MongoDB</SelectItem>
                    <SelectItem value="database_redis">Redis Cache</SelectItem>
                    <SelectItem value="database_rds">RDS Database</SelectItem>
                    <SelectItem value="database_dynamodb">DynamoDB</SelectItem>
                    <SelectItem value="database_elasticsearch">Elasticsearch</SelectItem>
                    <SelectItem value="storage_s3">S3 / Object Storage</SelectItem>
                    <SelectItem value="storage_efs">EFS / File Storage</SelectItem>
                    <SelectItem value="storage_ebs">EBS / Block Storage</SelectItem>
                    <SelectItem value="network_load_balancer">Load Balancer</SelectItem>
                    <SelectItem value="network_api_gateway">API Gateway</SelectItem>
                    <SelectItem value="network_cdn">CDN</SelectItem>
                    <SelectItem value="network_vpc">VPC / Virtual Network</SelectItem>
                    <SelectItem value="network_nat_gateway">NAT Gateway</SelectItem>
                    <SelectItem value="messaging_sqs">SQS / Queue</SelectItem>
                    <SelectItem value="messaging_sns">SNS / Notification</SelectItem>
                    <SelectItem value="messaging_kafka">Kafka</SelectItem>
                    <SelectItem value="messaging_rabbitmq">RabbitMQ</SelectItem>
                    <SelectItem value="cache_redis">Redis Cache</SelectItem>
                    <SelectItem value="cache_memcached">Memcached</SelectItem>
                    <SelectItem value="security_waf">WAF</SelectItem>
                    <SelectItem value="security_secrets_manager">Secrets Manager</SelectItem>
                    <SelectItem value="security_kms">KMS / Key Management</SelectItem>
                    <SelectItem value="monitoring_cloudwatch">CloudWatch</SelectItem>
                    <SelectItem value="monitoring_prometheus">Prometheus</SelectItem>
                    <SelectItem value="monitoring_grafana">Grafana</SelectItem>
                    <SelectItem value="other_custom">Custom Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and usage of this resource"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Cloud Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AWS">AWS</SelectItem>
                    <SelectItem value="Azure">Azure</SelectItem>
                    <SelectItem value="GCP">Google Cloud</SelectItem>
                    <SelectItem value="Scaleway">Scaleway</SelectItem>
                    <SelectItem value="DigitalOcean">DigitalOcean</SelectItem>
                    <SelectItem value="On-Premise">On-Premise</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  placeholder="e.g., us-east-1, eu-west-1"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint / URL</Label>
              <Input
                id="endpoint"
                placeholder="e.g., db.example.com:5432, https://bucket.s3.amazonaws.com"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.type}>
              <Save className="w-4 h-4 mr-2" />
              {editingResource ? 'Update' : 'Add'} Resource
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

