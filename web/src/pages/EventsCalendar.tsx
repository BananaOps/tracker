import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Status, EventType } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel } from '../lib/eventUtils'
import EventLinks from '../components/EventLinks'

export default function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { data } = useQuery({
    queryKey: ['events', 'list'],
    queryFn: () => eventsApi.list({ perPage: 500 }),
  })

  const events = data?.events || []

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (!event.metadata?.createdAt) return false
      return isSameDay(new Date(event.metadata.createdAt), day)
    })
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Calendrier des événements</h2>
        <p className="mt-1 text-sm text-gray-500">Vue mensuelle des événements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h3>
            <div className="flex space-x-2">
              <button onClick={previousMonth} className="btn-secondary p-2">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="btn-secondary p-2">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}

            {daysInMonth.map(day => {
              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-[80px] p-2 rounded-lg border transition-colors
                    ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                    ${isCurrentDay ? 'bg-blue-50' : 'bg-white'}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, idx) => {
                        const typeColor = getEventTypeColor(event.attributes.type)
                        return (
                          <div
                            key={idx}
                            className={`text-xs px-1 py-0.5 rounded truncate flex items-center space-x-1 ${typeColor.bg} ${typeColor.text}`}
                          >
                            {getEventTypeIcon(event.attributes.type, 'w-2.5 h-2.5 flex-shrink-0')}
                            <span className="truncate">{event.title}</span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionnez une date'}
          </h3>
          
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map(event => {
                const typeColor = getEventTypeColor(event.attributes.type)
                return (
                  <div key={event.metadata?.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      {getEventTypeIcon(event.attributes.type, 'w-4 h-4')}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColor.bg} ${typeColor.text}`}>
                        {getEventTypeLabel(event.attributes.type)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        event.attributes.status === Status.SUCCESS ? 'bg-green-100 text-green-800' :
                        event.attributes.status === Status.FAILURE || event.attributes.status === Status.ERROR ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {Status[event.attributes.status]}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.attributes.service}</p>
                    {(() => {
                      console.log('Calendar event:', event.title, 'links:', event.links)
                      return (
                        <EventLinks 
                          links={event.links}
                          source={event.attributes.source}
                          slackId={event.metadata?.slackId}
                          className="mt-2"
                        />
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun événement pour cette date</p>
          )}
        </div>
      </div>
    </div>
  )
}
