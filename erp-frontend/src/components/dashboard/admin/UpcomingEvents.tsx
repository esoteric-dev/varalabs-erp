import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../../../lib/queries/dashboard'
import type { Event as DashEvent } from '../../../lib/queries/dashboard'

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }),
    day: d.getDate().toString().padStart(2, '0'),
  }
}

export function UpcomingEvents() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 2 * 60_000,
  })

  const upcomingEvents = events.slice(0, 3)

  // Fallback events
  const fallbackEvents: DashEvent[] = [
    { id: 'f1', title: 'Staff Meeting', eventDate: new Date(Date.now() + 2 * 86400000).toISOString(), startTime: '10:00 AM' },
    { id: 'f2', title: 'Parent-Teacher Day', eventDate: new Date(Date.now() + 4 * 86400000).toISOString(), startTime: '09:00 AM' },
    { id: 'f3', title: 'Science Exhibition', eventDate: new Date(Date.now() + 8 * 86400000).toISOString(), startTime: 'All Day' },
  ]

  const displayEvents = upcomingEvents.length > 0 ? upcomingEvents : fallbackEvents

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-500">event</span>
          Upcoming Events
        </h3>
        <button className="size-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
          <span className="material-symbols-outlined text-xl">add</span>
        </button>
      </div>

      <div className="space-y-4">
        {displayEvents.map((event, idx) => {
          const { month, day } = formatEventDate(event.eventDate)
          return (
            <div key={event.id} className="flex gap-3 items-center group cursor-pointer">
              <div className={`w-14 flex flex-col items-center rounded-lg py-2 transition-colors ${
                idx === 0
                  ? 'bg-teal-50 text-teal-700 group-hover:bg-teal-100'
                  : 'bg-slate-50 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-600'
              }`}>
                <span className="text-xs font-bold uppercase">{month}</span>
                <span className="text-lg font-bold leading-none">{day}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {event.title}
                </h4>
                <p className="text-xs text-slate-500">
                  {event.startTime || 'TBD'}
                  {event.description && ` \u2022 ${event.description}`}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <button className="w-full mt-6 py-2 text-sm text-slate-500 font-bold hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-colors">
        View Calendar
      </button>
    </div>
  )
}
