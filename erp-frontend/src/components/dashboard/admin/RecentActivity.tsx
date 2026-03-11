import { useQuery } from '@tanstack/react-query'
import { fetchActivities } from '../../../lib/queries/dashboard'

const activityIcons: Record<string, { icon: string; bg: string; color: string }> = {
  enrollment: { icon: 'person_add', bg: 'bg-blue-50', color: 'text-blue-600' },
  payment: { icon: 'payments', bg: 'bg-green-50', color: 'text-green-600' },
  announcement: { icon: 'campaign', bg: 'bg-amber-50', color: 'text-amber-600' },
  default: { icon: 'info', bg: 'bg-slate-50', color: 'text-slate-600' },
}

function getActivityStyle(title: string) {
  const lower = title.toLowerCase()
  if (lower.includes('enroll') || lower.includes('student') || lower.includes('add')) return activityIcons.enrollment
  if (lower.includes('fee') || lower.includes('payment') || lower.includes('pay')) return activityIcons.payment
  if (lower.includes('announce') || lower.includes('notice') || lower.includes('notif')) return activityIcons.announcement
  return activityIcons.default
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function RecentActivity() {
  const { data: activities = [] } = useQuery({
    queryKey: ['studentActivities'],
    queryFn: fetchActivities,
    staleTime: 2 * 60_000,
  })

  const recentActivities = activities.slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500">history</span>
          Recent Activity
        </h3>
        {recentActivities.length > 0 && (
          <span className="text-xs text-slate-400 font-medium">{activities.length} total</span>
        )}
      </div>

      {recentActivities.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-slate-200 block mb-2">schedule</span>
          <p className="text-sm text-slate-400">No recent activity</p>
          <p className="text-xs text-slate-300 mt-1">Activities will appear here as they happen</p>
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-2 bottom-4 w-px bg-slate-100 z-0" />

          {recentActivities.map((activity) => {
            const style = getActivityStyle(activity.title)
            return (
              <div key={activity.id} className="relative z-10 flex gap-4">
                <div className={`size-10 rounded-full ${style.bg} border-2 border-white shadow-sm flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${style.color} text-lg`}>{style.icon}</span>
                </div>
                <div className="pb-2">
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">{activity.title}</span>
                    {activity.description && <>: {activity.description}</>}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTime(activity.activityDate)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
