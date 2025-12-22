import { useState } from 'react'
import { Plus, Trash2, Package, Edit3, Check, X } from 'lucide-react'
import { CatalogType, type UsedDeliverable } from '../types/api'

interface DeliverableInfo {
  name: string
  type: CatalogType
  availableVersions?: string[]
  latestVersion?: string
  referenceVersion?: string
}

interface UsedDeliverablesManagerProps {
  usedDeliverables: UsedDeliverable[]
  onUpdate: (deliverables: UsedDeliverable[]) => void
  availableDeliverables?: DeliverableInfo[]
}

export default function UsedDeliverablesManager({ 
  usedDeliverables, 
  onUpdate, 
  availableDeliverables = [] 
}: UsedDeliverablesManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newDeliverable, setNewDeliverable] = useState<UsedDeliverable>({
    name: '',
    type: CatalogType.PACKAGE,
    versionUsed: '',
    description: ''
  })

  // Get selected deliverable info from catalog
  const selectedDeliverableInfo = availableDeliverables.find(d => d.name === newDeliverable.name)
  
  // Filter deliverables by type for better UX
  const deliverablesByType = availableDeliverables.reduce((acc, deliverable) => {
    if (!acc[deliverable.type]) {
      acc[deliverable.type] = []
    }
    acc[deliverable.type].push(deliverable)
    return acc
  }, {} as Record<CatalogType, DeliverableInfo[]>)

  const handleDeliverableSelect = (deliverableName: string) => {
    const deliverableInfo = availableDeliverables.find(d => d.name === deliverableName)
    if (deliverableInfo) {
      setNewDeliverable({
        ...newDeliverable,
        name: deliverableName,
        type: deliverableInfo.type,
        versionUsed: deliverableInfo.referenceVersion || deliverableInfo.latestVersion || ''
      })
    }
  }

  const handleAdd = () => {
    if (newDeliverable.name && newDeliverable.versionUsed) {
      onUpdate([...usedDeliverables, newDeliverable])
      setNewDeliverable({
        name: '',
        type: CatalogType.PACKAGE,
        versionUsed: '',
        description: ''
      })
      setIsAdding(false)
    }
  }

  const handleEdit = (index: number, deliverable: UsedDeliverable) => {
    const updated = [...usedDeliverables]
    updated[index] = deliverable
    onUpdate(updated)
    setEditing
  }

  const handleRemove = (index: number) => {
    const updated = usedDeliverables.filter((_, i) => i !== index)
    onUpdate(updated)
  }

  const getTypeIcon = (type: CatalogType) => {
    switch (type) {
      case CatalogType.PACKAGE:
        return '📦'
      case CatalogType.CHART:
        return '⚙️'
      case CatalogType.CONTAINER:
        return '🐳'
      case CatalogType.MODULE:
        return '🧩'
      case CatalogType.LIBRARY:
        return '📚'
      default:
        return '📦'
    }
  }

  const getTypeColor = (type: CatalogType) => {
    switch (type) {
      case CatalogType.PACKAGE:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case CatalogType.CHART:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case CatalogType.CONTAINER:
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
      case CatalogType.MODULE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case CatalogType.LIBRARY:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getTypeLabel = (type: CatalogType) => {
    switch (type) {
      case CatalogType.PACKAGE:
        return 'Package'
      case CatalogType.CHART:
        return 'Chart'
      case CatalogType.CONTAINER:
        return 'Container'
      case CatalogType.MODULE:
        return 'Module'
      case CatalogType.LIBRARY:
        return 'Library'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Package className="w-5 h-5" />
          <span>Used Deliverables</span>
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Deliverable</span>
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Track which packages, charts, containers, modules, and libraries are used in this project with their specific versions.
      </p>

      {/* Add New Deliverable Form */}
      {isAdding && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deliverable
              </label>
              <select
                value={newDeliverable.name}
                onChange={(e) => handleDeliverableSelect(e.target.value)}
                className="input"
              >
                <option value="">Select a deliverable...</option>
                {Object.entries(deliverablesByType).map(([type, deliverables]) => (
                  <optgroup key={type} label={getTypeLabel(type as CatalogType)}>
                    {deliverables.map((deliverable) => (
                      <option key={deliverable.name} value={deliverable.name}>
                        {getTypeIcon(deliverable.type)} {deliverable.name}
                        {deliverable.latestVersion && ` (latest: ${deliverable.latestVersion})`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {newDeliverable.name && selectedDeliverableInfo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Type: {getTypeLabel(selectedDeliverableInfo.type)}
                  {selectedDeliverableInfo.latestVersion && ` • Latest: ${selectedDeliverableInfo.latestVersion}`}
                  {selectedDeliverableInfo.referenceVersion && ` • Reference: ${selectedDeliverableInfo.referenceVersion}`}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Version Used
              </label>
              {selectedDeliverableInfo?.availableVersions && selectedDeliverableInfo.availableVersions.length > 0 ? (
                <select
                  value={newDeliverable.versionUsed}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, versionUsed: e.target.value })}
                  className="input"
                >
                  <option value="">Select version...</option>
                  {selectedDeliverableInfo.referenceVersion && (
                    <option value={selectedDeliverableInfo.referenceVersion}>
                      {selectedDeliverableInfo.referenceVersion} (recommended)
                    </option>
                  )}
                  {selectedDeliverableInfo.latestVersion && 
                   selectedDeliverableInfo.latestVersion !== selectedDeliverableInfo.referenceVersion && (
                    <option value={selectedDeliverableInfo.latestVersion}>
                      {selectedDeliverableInfo.latestVersion} (latest)
                    </option>
                  )}
                  {selectedDeliverableInfo.availableVersions
                    .filter(v => v !== selectedDeliverableInfo.referenceVersion && v !== selectedDeliverableInfo.latestVersion)
                    .map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newDeliverable.versionUsed}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, versionUsed: e.target.value })}
                  placeholder="e.g., 18.2.0, latest, v1.2.3"
                  className="input"
                />
              )}
              {selectedDeliverableInfo?.referenceVersion && (
                <button
                  type="button"
                  onClick={() => setNewDeliverable({ ...newDeliverable, versionUsed: selectedDeliverableInfo.referenceVersion! })}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  Use recommended version ({selectedDeliverableInfo.referenceVersion})
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newDeliverable.description}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                placeholder="Usage context"
                className="input"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quick Actions
                </label>
                <div className="flex space-x-2">
                  {selectedDeliverableInfo?.latestVersion && (
                    <button
                      type="button"
                      onClick={() => setNewDeliverable({ ...newDeliverable, versionUsed: selectedDeliverableInfo.latestVersion! })}
                      className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      Latest
                    </button>
                  )}
                  {selectedDeliverableInfo?.referenceVersion && (
                    <button
                      type="button"
                      onClick={() => setNewDeliverable({ ...newDeliverable, versionUsed: selectedDeliverableInfo.referenceVersion! })}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Recommended
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewDeliverable({
                  name: '',
                  type: CatalogType.PACKAGE,
                  versionUsed: '',
                  description: ''
                })
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleAdd}
              disabled={!newDeliverable.name || !newDeliverable.versionUsed}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Deliverables List */}
      {usedDeliverables.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No deliverables tracked yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Add packages, charts, containers, modules, or libraries used in this project
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {usedDeliverables.map((deliverable, index) => (
            <DeliverableItem
              key={index}
              deliverable={deliverable}
              index={index}
              isEditing={editingIndex === index}
              onEdit={(updated) => handleEdit(index, updated)}
              onStartEdit={() => setEditingIndex(index)}
              onCancelEdit={() => setEditingIndex(null)}
              onRemove={() => handleRemove(index)}
              availableDeliverables={availableDeliverables}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
              getTypeLabel={getTypeLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DeliverableItemProps {
  deliverable: UsedDeliverable
  index: number
  isEditing: boolean
  onEdit: (deliverable: UsedDeliverable) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  availableDeliverables: DeliverableInfo[]
  getTypeIcon: (type: CatalogType) => string
  getTypeColor: (type: CatalogType) => string
  getTypeLabel: (type: CatalogType) => string
}

function DeliverableItem({
  deliverable,
  isEditing,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onRemove,
  availableDeliverables,
  getTypeIcon,
  getTypeColor,
  getTypeLabel
}: DeliverableItemProps) {
  const [editForm, setEditForm] = useState<UsedDeliverable>(deliverable)

  // Get selected deliverable info from catalog for editing
  const selectedDeliverableInfo = availableDeliverables.find(d => d.name === editForm.name)
  
  // Filter deliverables by type for better UX
  const deliverablesByType = availableDeliverables.reduce((acc, deliverable) => {
    if (!acc[deliverable.type]) {
      acc[deliverable.type] = []
    }
    acc[deliverable.type].push(deliverable)
    return acc
  }, {} as Record<CatalogType, DeliverableInfo[]>)

  const handleDeliverableSelect = (deliverableName: string) => {
    const deliverableInfo = availableDeliverables.find(d => d.name === deliverableName)
    if (deliverableInfo) {
      setEditForm({
        ...editForm,
        name: deliverableName,
        type: deliverableInfo.type,
        versionUsed: deliverableInfo.referenceVersion || deliverableInfo.latestVersion || editForm.versionUsed
      })
    }
  }

  const handleSave = () => {
    if (editForm.name && editForm.versionUsed) {
      onEdit(editForm)
    }
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deliverable
            </label>
            <select
              value={editForm.name}
              onChange={(e) => handleDeliverableSelect(e.target.value)}
              className="input"
            >
              <option value="">Select a deliverable...</option>
              {Object.entries(deliverablesByType).map(([type, deliverables]) => (
                <optgroup key={type} label={getTypeLabel(type as CatalogType)}>
                  {deliverables.map((deliverable) => (
                    <option key={deliverable.name} value={deliverable.name}>
                      {getTypeIcon(deliverable.type)} {deliverable.name}
                      {deliverable.latestVersion && ` (latest: ${deliverable.latestVersion})`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {editForm.name && selectedDeliverableInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type: {getTypeLabel(selectedDeliverableInfo.type)}
                {selectedDeliverableInfo.latestVersion && ` • Latest: ${selectedDeliverableInfo.latestVersion}`}
                {selectedDeliverableInfo.referenceVersion && ` • Reference: ${selectedDeliverableInfo.referenceVersion}`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Version Used
            </label>
            {selectedDeliverableInfo?.availableVersions && selectedDeliverableInfo.availableVersions.length > 0 ? (
              <select
                value={editForm.versionUsed}
                onChange={(e) => setEditForm({ ...editForm, versionUsed: e.target.value })}
                className="input"
              >
                <option value="">Select version...</option>
                {selectedDeliverableInfo.referenceVersion && (
                  <option value={selectedDeliverableInfo.referenceVersion}>
                    {selectedDeliverableInfo.referenceVersion} (recommended)
                  </option>
                )}
                {selectedDeliverableInfo.latestVersion && 
                 selectedDeliverableInfo.latestVersion !== selectedDeliverableInfo.referenceVersion && (
                  <option value={selectedDeliverableInfo.latestVersion}>
                    {selectedDeliverableInfo.latestVersion} (latest)
                  </option>
                )}
                {selectedDeliverableInfo.availableVersions
                  .filter(v => v !== selectedDeliverableInfo.referenceVersion && v !== selectedDeliverableInfo.latestVersion)
                  .map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editForm.versionUsed}
                onChange={(e) => setEditForm({ ...editForm, versionUsed: e.target.value })}
                placeholder="e.g., 18.2.0, latest, v1.2.3"
                className="input"
              />
            )}
            <div className="flex space-x-2 mt-1">
              {selectedDeliverableInfo?.latestVersion && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, versionUsed: selectedDeliverableInfo.latestVersion! })}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  Use latest ({selectedDeliverableInfo.latestVersion})
                </button>
              )}
              {selectedDeliverableInfo?.referenceVersion && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, versionUsed: selectedDeliverableInfo.referenceVersion! })}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Use recommended ({selectedDeliverableInfo.referenceVersion})
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Usage context"
              className="input"
            />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 mt-4">
          <button
            onClick={onCancelEdit}
            className="btn-secondary flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.versionUsed}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <div className="text-2xl">{getTypeIcon(deliverable.type)}</div>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {deliverable.name}
            </span>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(deliverable.type)}`}>
              {getTypeLabel(deliverable.type)}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              v{deliverable.versionUsed}
            </span>
          </div>
          {deliverable.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {deliverable.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onStartEdit}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit deliverable"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Remove deliverable"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
