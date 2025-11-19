import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language } from '../types/api'
import { Package, ExternalLink } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faJava, 
  faPython, 
  faPhp, 
  faJs, 
  faDocker, 
  faRust,
  faGolang
} from '@fortawesome/free-brands-svg-icons'
import { 
  faCode, 
  faFileCode, 
  faCube 
} from '@fortawesome/free-solid-svg-icons'

export default function CatalogTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 100 }),
  })

  const catalogs = data?.catalogs || []

  const getCatalogTypeLabel = (type: CatalogType | string) => {
    const typeStr = String(type).toLowerCase()
    const labels: Record<string, string> = {
      'module': 'Module',
      'library': 'Bibliothèque',
      'workflow': 'Workflow',
      'project': 'Projet',
      'chart': 'Chart',
      'package': 'Package',
      'container': 'Container',
    }
    return labels[typeStr] || 'Inconnu'
  }

  const getLanguageLabel = (lang: Language | string) => {
    const langStr = String(lang).toLowerCase()
    const labels: Record<string, string> = {
      'golang': 'Go',
      'kotlin': 'Kotlin',
      'java': 'Java',
      'terraform': 'Terraform',
      'helm': 'Helm',
      'javascript': 'JavaScript',
      'yaml': 'YAML',
      'docker': 'Docker',
      'python': 'Python',
      'php': 'PHP',
      'rust': 'Rust',
      'typescript': 'TypeScript',
      'groovy': 'Groovy',
    }
    return labels[langStr] || 'Inconnu'
  }

  const getLanguageIcon = (lang: Language | string) => {
    const langStr = String(lang).toLowerCase()
    
    switch (langStr) {
      case 'java':
        return <FontAwesomeIcon icon={faJava} className="w-4 h-4" style={{ color: '#f89820' }} />
      case 'python':
        return <FontAwesomeIcon icon={faPython} className="w-4 h-4" style={{ color: '#3776ab' }} />
      case 'php':
        return <FontAwesomeIcon icon={faPhp} className="w-4 h-4" style={{ color: '#777bb4' }} />
      case 'javascript':
        return <FontAwesomeIcon icon={faJs} className="w-4 h-4" style={{ color: '#f7df1e' }} />
      case 'typescript':
        return <FontAwesomeIcon icon={faJs} className="w-4 h-4" style={{ color: '#3178c6' }} />
      case 'docker':
        return <FontAwesomeIcon icon={faDocker} className="w-4 h-4" style={{ color: '#2496ed' }} />
      case 'rust':
        return <FontAwesomeIcon icon={faRust} className="w-4 h-4" style={{ color: '#ce422b' }} />
      case 'golang':
        return <FontAwesomeIcon icon={faGolang} className="w-4 h-4" style={{ color: '#00add8' }} />
      case 'kotlin':
        return <FontAwesomeIcon icon={faJava} className="w-4 h-4" style={{ color: '#7f52ff' }} />
      case 'terraform':
        return <FontAwesomeIcon icon={faCube} className="w-4 h-4 text-purple-700" />
      case 'helm':
        return <FontAwesomeIcon icon={faCube} className="w-4 h-4 text-blue-700" />
      case 'yaml':
        return <FontAwesomeIcon icon={faFileCode} className="w-4 h-4 text-red-500" />
      case 'groovy':
        return <FontAwesomeIcon icon={faCode} className="w-4 h-4 text-teal-600" />
      default:
        return <FontAwesomeIcon icon={faCode} className="w-4 h-4 text-gray-600" />
    }
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
        <a
          href="/catalog/create"
          className="btn-primary"
        >
          Ajouter au catalogue
        </a>
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
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center space-x-1 w-fit">
                      {getLanguageIcon(catalog.languages)}
                      <span>{getLanguageLabel(catalog.languages)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {catalog.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
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
