import { useState } from 'react'
import { WidgetHeader } from './WidgetHeader'
import { TimeFilterDropdown } from './TimeFilterDropdown'
import type { StudentActivity } from '../../../lib/queries/dashboard'

interface StudentActivityWidgetProps {
  activities: StudentActivity[]
}

export function StudentActivityWidget({ activities }: StudentActivityWidgetProps) {
  const [period, setPeriod] = useState('this_month')

  const PERIOD_OPTIONS = [
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Last Week', value: 'last_week' },
  ]

  const getInitials = (title: string) => {
    const words = title.split(' ')
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : title.substring(0, 2).toUpperCase()
  }

  const avatarColors = [
    'from-blue-400 to-blue-500',
    'from-emerald-400 to-emerald-500',
    'from-amber-400 to-amber-500',
    'from-purple-400 to-purple-500',
    'from-rose-400 to-rose-500',
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Student Activity"
        rightContent={<TimeFilterDropdown value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />}
      />
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No recent activities</p>
        ) : (
          activities.slice(0, 5).map((a, i) => (
            <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/60 transition-colors">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {getInitials(a.title)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                {a.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{a.activityDate}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
