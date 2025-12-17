import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ProjectStatsCardProps {
  project: string
  deployments: number
  incidents: number
  operations: number
  drifts: number
  total: number
  rank: number
}

export default function ProjectStatsCard({ 
  project, 
  deployments, 
  incidents, 
  operations, 
  drifts, 
  total, 
  rank 
}: ProjectStatsCardProps) {
  const incidentRate = total > 0 ? Math.round((incidents / total) * 100) : 0
  const deploymentRate = total > 0 ? Math.round((deployments / total) * 100) : 0
  
  const getTrendIcon = (rate: number) => {
    if (rate > 60) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (rate < 30) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-600" />
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (rank === 2) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-bold rounded-full ${getRankColor(rank)}`}>
            #{rank}
          </span>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {project}
          </h4>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon(deploymentRate)}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {total} events
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{deployments}</div>
          <div className="text-xs text-gray-500">Deployments</div>
          <div className="text-xs text-gray-400">{deploymentRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{incidents}</div>
          <div className="text-xs text-gray-500">Incidents</div>
          <div className="text-xs text-gray-400">{incidentRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{operations}</div>
          <div className="text-xs text-gray-500">Operations</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{drifts}</div>
          <div className="text-xs text-gray-500">Drifts</div>
        </div>
      </div>
    </div>
  )
}
