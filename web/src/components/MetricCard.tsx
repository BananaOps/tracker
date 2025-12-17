import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  red: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function MetricCard({ title, value, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
    </div>
  )
}
