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
  blue: 'text-hud-primary bg-hud-primary/10 dark:bg-hud-primary/15 dark:text-[#8fb4ff]',
  green: 'text-green-700 bg-green-100 dark:bg-green-900/25 dark:text-green-300',
  red: 'text-hud-error bg-red-100 dark:bg-red-950/35 dark:text-red-300',
  amber: 'text-amber-700 bg-amber-100 dark:bg-amber-950/35 dark:text-amber-300',
  purple: 'text-violet-700 bg-violet-100 dark:bg-violet-950/35 dark:text-violet-300',
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
            <p className="text-sm font-medium text-hud-on-surface-var">{title}</p>
            <p className="text-2xl font-bold text-hud-on-surface">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
    </div>
  )
}
