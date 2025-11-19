import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language } from '../types/api'
import { Package, ExternalLink } from 'lucide-react'

export default function CatalogTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 100 }),
  })

  const catalogs = data?.catalogs || []

  const getCatalogTypeLabel = (type: CatalogType) => {
    const labels: Record<CatalogType, string> = {
      [CatalogType.MODULE]: 'Module',
      [CatalogType.LIBRARY]: 'Bibliothèque',
      [CatalogType.WORKFLOW]: 'Workflow',
      [CatalogType.PROJECT]: 'Projet',
      [CatalogType.CHART]: 'Chart',
      [CatalogType.PACKAGE]: 'Package',
      [CatalogType.CONTAINER]: 'Container',
    }
    return labels[type] || 'Inconnu'
  }

  const getLanguageLabel = (lang: Language) => {
    const labels: Record<Language, string> = {
      [Language.GOLANG]: 'Go',
      [Language.KOTLIN]: 'Kotlin',
      [Language.JAVA]: 'Java',
      [Language.TERRAFORM]: 'Terraform',
      [Language.HELM]: 'Helm',
      [Language.JAVASCRIPT]: 'JavaScript',
      [Language.YAML]: 'YAML',
      [Language.DOCKER]: 'Docker',
      [Language.PYTHON]: 'Python',
      [Language.PHP]: 'PHP',
      [Language.RUST]: 'Rust',
      [Language.TYPESCRIPT]: 'TypeScript',
      [Language.GROOVY]: 'Groovy',
    }
    return labels[lang] || 'Inconnu'
  }

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Catalogue</h2>
          <p className="mt-1 text-sm text-gray-500">
            Inventaire des modules, bibliothèques et projets ({catalogs.length} éléments)
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Langage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liens
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {catalogs.map((catalog) => (
                <tr key={catalog.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{catalog.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {getCatalogTypeLabel(catalog.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {getLanguageLabel(catalog.languages)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {catalog.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {catalog.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      {catalog.repository && (
                        <a
                          href={catalog.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                          title="Repository"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {catalog.link && (
                        <a
                          href={catalog.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                          title="Documentation"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {catalogs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun élément dans le catalogue
        </div>
      )}
    </div>
  )
}
