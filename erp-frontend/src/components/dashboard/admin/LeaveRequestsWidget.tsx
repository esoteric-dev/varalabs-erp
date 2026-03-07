import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { WidgetHeader } from './WidgetHeader'
import { TimeFilterDropdown } from './TimeFilterDropdown'
import { reviewLeave } from '../../../lib/queries/leave'
import type { LeaveRequest } from '../../../lib/queries/dashboard'

interface LeaveRequestsWidgetProps {
  leaves: LeaveRequest[]
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  casual: 'bg-blue-50 text-blue-600',
  sick: 'bg-red-50 text-red-600',
  earned: 'bg-green-50 text-green-600',
  other: 'bg-gray-100 text-gray-600',
}

export function LeaveRequestsWidget({ leaves }: LeaveRequestsWidgetProps) {
  const [period, setPeriod] = useState('today')
  const qc = useQueryClient()

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reviewLeave(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaveRequests'] })
    },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Leave Requests"
        rightContent={<TimeFilterDropdown value={period} onChange={setPeriod} />}
      />
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {leaves.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No pending requests</p>
        ) : (
          leaves.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                {l.userName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{l.userName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${LEAVE_TYPE_COLORS[l.leaveType] || LEAVE_TYPE_COLORS.other}`}>
                    {l.leaveType}
                  </span>
                  <span className="text-xs text-gray-400">{l.startDate} - {l.endDate}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Applied: {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {l.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => reviewMutation.mutate({ id: l.id, status: 'approved' })}
                      disabled={reviewMutation.isPending}
                      className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: l.id, status: 'rejected' })}
                      disabled={reviewMutation.isPending}
                      className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    l.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    l.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>{l.status}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
