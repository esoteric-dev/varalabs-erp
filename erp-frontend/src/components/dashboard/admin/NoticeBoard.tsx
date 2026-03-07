import { Link } from '@tanstack/react-router'
import { WidgetHeader } from './WidgetHeader'
import type { Notice } from '../../../lib/queries/dashboard'

interface NoticeBoardProps {
  notices: Notice[]
}

export function NoticeBoard({ notices }: NoticeBoardProps) {
  const daysAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return '1 Day'
    return `${diff} Days`
  }

  const dayBadgeColor = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diff <= 3) return 'bg-emerald-50 text-emerald-600'
    if (diff <= 7) return 'bg-blue-50 text-blue-600'
    if (diff <= 14) return 'bg-amber-50 text-amber-600'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Notice Board"
        rightContent={
          <Link to="/notices" className="text-xs text-teal-600 hover:underline font-medium">View All</Link>
        }
      />
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {notices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No notices</p>
        ) : (
          notices.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-start justify-between p-3 rounded-lg bg-gray-50/60 hover:bg-blue-50/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Added on: {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${dayBadgeColor(n.createdAt)}`}>
                {daysAgo(n.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
