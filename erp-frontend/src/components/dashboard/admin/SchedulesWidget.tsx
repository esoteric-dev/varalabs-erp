import { Calendar, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { WidgetHeader } from './WidgetHeader'
import type { Event as DashEvent } from '../../../lib/queries/dashboard'

interface SchedulesWidgetProps {
  events: DashEvent[]
}

export function SchedulesWidget({ events }: SchedulesWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Schedules"
        rightContent={
          <Link to="/notices" className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add New
          </Link>
        }
      />
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No upcoming events</p>
        ) : (
          events.slice(0, 5).map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/60 hover:bg-teal-50/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ev.eventDate && new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {ev.startTime && (
                  <p className="text-xs text-gray-400">{ev.startTime} - {ev.endTime || ''}</p>
                )}
              </div>
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-500">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
