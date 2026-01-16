import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, type ProjectCompliance, type DeliverableUsage } from '../types/api'
import { ArrowLeft, AlertTriangle, CheckCircle, Package, TrendingUp, Search, X, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'

export default function VersionCompliance() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const { data: complianceData, isLoading, error } = (useQuery as any)({
    queryKey: ['catalog', 'version-compliance'],
    queryFn: () => catalogApi.getVersionCompliance(),
  })

  const deliverableTypes = [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE]

  const filteredData = useMemo(() => {
    if (!complianceData?.projects) return []
    
    let filtered = complianceData.projects
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((project: ProjectCompliance) => {
        const matchesProjectName = project.projectName.toLowerCase().includes(query)
        const matchesDeliverableName = project.deliverables.some((d: DeliverableUsage) => 
          d.name.toLowerCase().includes(query)
        )
        return matchesProjectName || matchesDeliverableName
      })
    }
    
    // Filter by deliverable types
    if (selectedTypes.length > 0) {
      filtered = filtered.map((project: ProjectCompliance) => ({
        ...project,
        deliverables: project.deliverables.filter((d: DeliverableUsage) => 
          selectedTypes.includes(String(d.type).toLowerCase())
        )
      })).filter((project: ProjectCompliance) => project.deliverables.length > 0)
    }
    
    return filtered
  }, [complianceData?.projects, searchQuery, selectedTypes])

  const summary = useMemo(() => {
    if (!complianceData?.summary) {
      return {
        totalProjects: 0,
        compliantProjects: 0,
        nonCompliantProjects: 0,
        neutralProjects: 0,
        overallCompliance: 0
      }
    }

    // Count projects without used deliverables as neutral
    const projectsWithoutDeliverables = complianceData.projects?.filter((p: ProjectCompliance) => 
      p.totalCount === 0
    ).length || 0

    return {
      totalProjects: complianceData.summary.totalProjects,
      compliantProjects: complianceData.summary.compliantProjects,
      nonCompliantProjects: complianceData.summary.nonCompliantProjects,
      neutralProjects: projectsWithoutDeliverables,
      overallCompliance: Math.round(complianceData.summary.overallCompliancePercentage)
    }
  }, [complianceData?.summary, complianceData?.projects])

  const toggleTypeFilter = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type))
    } else {
      setSelectedTypes([...selectedTypes, type])
    }
  }

  const getComplianceStatus = (project: ProjectCompliance) => {
    if (project.totalCount === 0) {
      return { 
        status: 'neutral', 
        icon: Minus, 
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        label: 'No Deliverables'
      }
    } else if (project.compliancePercentage === 100) {
      return { 
        status: 'compliant', 
        icon: CheckCircle, 
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Compliant'
      }
    } else {
      return { 
        status: 'non-compliant', 
        icon: AlertTriangle, 
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Non-Compliant'
      }
    }
  }

  const handleProjectClick = (projectName: string) => {
    navigate(`/catalog/${projectName}`)
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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
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
              Track which projects are using outdated versions of their declared deliverables
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
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
               background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)',
               borderTop: '4px solid #6b7280',
               boxShadow: '0 0 20px rgba(107, 114, 128, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
            {summary.neutralProjects}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No Deliverables
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-1.5">
        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by project name or deliverable name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Type Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by type:</span>
              {deliverableTypes.map((type) => {
                const typeStr = String(type).toLowerCase()
                return (
                  <Badge
                    key={type}
                    variant={selectedTypes.includes(typeStr) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleTypeFilter(typeStr)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                )
              })}
            </div>
            
            {(selectedTypes.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTypes([])
                  setSearchQuery('')
                }}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Package className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or search query
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Compliance
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Deliverables
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Outdated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((project: ProjectCompliance) => {
                  const status = getComplianceStatus(project)
                  const StatusIcon = status.icon
                  
                  return (
                    <tr key={project.projectName} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {project.projectName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">
                              {status.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={status.status === 'compliant' ? 'default' : status.status === 'non-compliant' ? 'destructive' : 'secondary'}
                          className="flex items-center w-fit"
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg font-bold ${status.color}`}>
                            {project.totalCount === 0 ? '-' : `${project.compliancePercentage}%`}
                          </span>
                          {project.totalCount > 0 && (
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  project.compliancePercentage === 100 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${project.compliancePercentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {project.totalCount}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          project.outdatedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {project.outdatedCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProjectClick(project.projectName)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
