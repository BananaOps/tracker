import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, type ProjectCompliance, type DeliverableUsage } from '../types/api'
import { ArrowLeft, AlertTriangle, CheckCircle, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function VersionCompliance() {
  const navigate = useNavigate()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const { data: complianceData, isLoading, error } = (useQuery as any)({
    queryKey: ['catalog', 'version-compliance'],
    queryFn: () => catalogApi.getVersionCompliance(),
  })

  const deliverableTypes = [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE]

  const filteredData = useMemo(() => {
    if (!complianceData?.projects) return []
    
    if (selectedTypes.length === 0) return complianceData.projects
    
    return complianceData.projects.map((project: ProjectCompliance) => ({
      ...project,
      deliverables: project.deliverables.filter((d: DeliverableUsage) => 
        selectedTypes.includes(String(d.type).toLowerCase())
      )
    })).filter((project: ProjectCompliance) => project.deliverables.length > 0)
  }, [complianceData?.projects, selectedTypes])

  const summary = useMemo(() => {
    if (!complianceData?.summary) {
      return {
        totalProjects: 0,
        compliantProjects: 0,
        nonCompliantProjects: 0,
        overallCompliance: 0
      }
    }

    return {
      totalProjects: complianceData.summary.totalProjects,
      compliantProjects: complianceData.summary.compliantProjects,
      nonCompliantProjects: complianceData.summary.nonCompliantProjects,
      overallCompliance: Math.round(complianceData.summary.overallCompliancePercentage)
    }
  }, [complianceData?.summary])

  const toggleTypeFilter = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type))
    } else {
      setSelectedTypes([...selectedTypes, type])
    }
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getComplianceBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading version compliance data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">Failed to load version compliance data</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/catalog')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-3">
              <TrendingUp className="w-8 h-8" />
              <span>Version Compliance</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track which projects are using outdated deliverables
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
               borderTop: '4px solid #6366f1',
               boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {summary.totalProjects}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Projects
          </div>
        </div>

        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%)',
               borderTop: '4px solid #22c55e',
               boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {summary.compliantProjects}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Compliant Projects
          </div>
        </div>

        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)',
               borderTop: '4px solid #ef4444',
               boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {summary.nonCompliantProjects}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Non-Compliant Projects
          </div>
        </div>

        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%)',
               borderTop: '4px solid #3b82f6',
               boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <div className={`text-3xl font-bold mb-1 ${getComplianceColor(summary.overallCompliance)}`}>
            {summary.overallCompliance}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Overall Compliance
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4 flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by type:</span>
            {deliverableTypes.map((type) => {
              const typeStr = String(type).toLowerCase()
              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(typeStr)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedTypes.includes(typeStr)
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>
          
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredData.map((project: ProjectCompliance) => (
          <div key={project.projectName} className={`card border ${getComplianceBg(project.compliancePercentage)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Package className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {project.projectName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {project.totalCount} deliverables • {project.outdatedCount} outdated
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`text-2xl font-bold ${getComplianceColor(project.compliancePercentage)}`}>
                  {project.compliancePercentage}%
                </div>
                {project.compliancePercentage === 100 ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              {project.deliverables.map((deliverable: DeliverableUsage) => (
                <div
                  key={deliverable.name}
                  className={`p-3 rounded-lg border ${
                    deliverable.isOutdated
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {deliverable.name}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {deliverable.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        Current: <span className="font-medium">{deliverable.currentVersion || 'N/A'}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Reference: <span className="font-medium text-green-600 dark:text-green-400">{deliverable.referenceVersion || 'N/A'}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Latest: <span className="font-medium text-blue-600 dark:text-blue-400">{deliverable.latestVersion || 'N/A'}</span>
                      </div>
                      
                      {deliverable.isOutdated ? (
                        <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-xs font-medium">Outdated</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Up to date</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No projects found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
