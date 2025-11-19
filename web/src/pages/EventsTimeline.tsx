import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { format, subDays, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Status, Priority, EventType } from '../types/api'
import { Clock, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel } from '../lib/eventUtils'
import { useState } from 'react'

type TimeFilter = 7 | 15 | 30 | 'all'

export default function EventsTimeline() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'list'],
    queryFn: () => eventsApi.list({ perPage: 500 }),
  })

  const allEvents = data?.events || []

  // Filtrer les événements par période
  const events = allEvents.filter(event => {
    if (timeFilter === 'all') return true
    if (!event.metadata?.createdAt) return false
    
    const eventDate = new Date(event.metadata.createdAt)
    const filterDate = subDays(new Date(), timeFilter)
    return isAfter(eventDate, filterDate)
  })

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case Status.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case Status.FAILURE:
      case Status.ERROR:
        return <XCircle className="w-5 h-5 text-red-500" />
      case Status.START:
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Timeline des événements</h2>
          <p className="mt-1 text-sm text-gray-500">
            Historique chronologique ({events.length} événements)
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeFilter(7)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 7
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setTimeFilter(15)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 15
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              15 jours
            </button>
            <button
              onClick={() => setTimeFilter(30)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 30
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tout
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {events.map((event) => {
            const typeColor = getEventTypeColor(event.attributes.type)
            return (
              <div key={event.metadata?.id} className="relative flex items-start space-x-4">
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 bg-white border-2 ${typeColor.border} rounded-full`}>
                  {getEventTypeIcon(event.attributes.type, 'w-6 h-6')}
                </div>
                
                <div className="flex-1 card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${typeColor.bg} ${typeColor.text}`}>
                          {getEventTypeIcon(event.attributes.type, 'w-3 h-3')}
                          <span>{getEventTypeLabel(event.attributes.type)}</span>
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.attributes.priority === Priority.P1 ? 'bg-red-100 text-red-800' :
                          event.attributes.priority === Priority.P2 ? 'bg-orange-100 text-orange-800' :
                          event.attributes.priority === Priority.P3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          P{event.attributes.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.attributes.status === Status.SUCCESS ? 'bg-green-100 text-green-800' :
                          event.attributes.status === Status.FAILURE || event.attributes.status === Status.ERROR ? 'bg-red-100 text-red-800' :
                          event.attributes.status === Status.START ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {Status[event.attributes.status]}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.attributes.message}</p>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>Service: <span className="font-medium">{event.attributes.service}</span></span>
                        <span>Source: <span className="font-medium">{event.attributes.source}</span></span>
                        {event.attributes.owner && (
                          <span>Owner: <span className="font-medium">{event.attributes.owner}</span></span>
                        )}
                      </div>

                      {event.links?.pullRequestLink && (
                        <a 
                          href={event.links.pullRequestLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                        >
                          Voir la Pull Request →
                        </a>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-gray-500">
                      {event.metadata?.createdAt && (
                        <time>
                          {format(new Date(event.metadata.createdAt), 'PPp', { locale: fr })}
                        </time>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
