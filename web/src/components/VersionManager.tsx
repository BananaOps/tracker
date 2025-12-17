import { useState } from 'react'
import { Plus, Tag, AlertTriangle, Star, Target } from 'lucide-react'

interface DeliverableVersionsProps {
  serviceName: string
  serviceType: 'package' | 'chart' | 'container' | 'module'
  availableVersions: string[]
  latestVersion?: string
  referenceVersion?: string
  onUpdateVersions: (versions: string[], latest?: string, reference?: string) => void
}

export default function DeliverableVersions({ 
  serviceName, 
  serviceType,
  availableVersions,
  latestVersion,
  referenceVersion,
  onUpdateVersions
}: DeliverableVersionsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newVersion, setNewVersion] = useState('')

  const handleAddVersion = () => {
    if (newVersion && !availableVersions.includes(newVersion)) {
      const updatedVersions = [...availableVersions, newVersion].sort((a, b) => 
        b.localeCompare(a, undefined, { numeric: true })
      )
      onUpdateVersions(updatedVersions, latestVersion, referenceVersion)
      setNewVersion('')
      setShowAddForm(false)
    }
  }

  const handleRemoveVersion = (version: string) => {
    const updatedVersions = availableVersions.filter(v => v !== version)
    const newLatest = latestVersion === version ? undefined : latestVersion
    const newReference = referenceVersion === version ? undefined : referenceVersion
    onUpdateVersions(updatedVersions, newLatest, newReference)
  }

  const handleSetLatest = (version: string) => {
    onUpdateVersions(availableVersions, version, referenceVersion)
  }

  const handleSetReference = (version: string) => {
    onUpdateVersions(availableVersions, latestVersion, version)
  }

  const sortedVersions = [...availableVersions].sort((a, b) => 
    b.localeCompare(a, undefined, { numeric: true })
  )

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Tag className="w-5 h-5" />
          <span>Available Versions ({availableVersions.length})</span>
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Version</span>
        </button>
      </div>

      {/* Add Version Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Add New Version</h4>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="e.g., 1.2.0, v2.1.0-beta"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              onKeyPress={(e) => e.key === 'Enter' && handleAddVersion()}
            />
            <button
              onClick={handleAddVersion}
              disabled={!newVersion || availableVersions.includes(newVersion)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Version Status Summary */}
      {(latestVersion || referenceVersion) && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            {latestVersion && (
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-100">Latest: <strong>{latestVersion}</strong></span>
              </div>
            )}
            {referenceVersion && (
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-900 dark:text-green-100">Reference: <strong>{referenceVersion}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="space-y-2">
        {sortedVersions.map((version) => (
          <div
            key={version}
            className={`p-3 rounded-lg border transition-all ${
              version === latestVersion && version === referenceVersion
                ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'
                : version === latestVersion
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                : version === referenceVersion
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {version}
                </span>
                
                <div className="flex items-center space-x-2">
                  {version === latestVersion && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <Star className="w-3 h-3 mr-1" />
                      Latest
                    </span>
                  )}
                  
                  {version === referenceVersion && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <Target className="w-3 h-3 mr-1" />
                      Reference
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {version !== latestVersion && (
                  <button
                    onClick={() => handleSetLatest(version)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Set as latest"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                
                {version !== referenceVersion && (
                  <button
                    onClick={() => handleSetReference(version)}
                    className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Set as reference"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => handleRemoveVersion(version)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Remove version"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {availableVersions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No versions available</p>
            <p className="text-xs mt-1">Add versions to track {serviceType} releases</p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Latest:</strong> Most recent version available • 
          <strong> Reference:</strong> Recommended version for projects to use
        </p>
      </div>
    </div>
  )
}
