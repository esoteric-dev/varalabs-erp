import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Plus, Check, X } from 'lucide-react'
import { useState } from 'react'
import { fetchMyLeaveRequests, fetchLeaveRequests, fetchStudentLeaveRequests, applyLeave, reviewLeave } from '../../lib/queries/leave'
import { fetchMyClasses } from '../../lib/queries/teacher'
import type { LeaveRequest } from '../../lib/queries/leave'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/leave')({
  component: LeavePage,
})

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const leaveTypeLabel: Record<string, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  other: 'Other',
}

function LeavePage() {
  const { myPermissions, myRoles } = Route.useRouteContext()
  const perms = myPermissions as string[]
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')
  const canManage = perms.includes('leave.manage')
  const canView = perms.includes('leave.view')

  const [showForm, setShowForm] = useState(false)
  const [leaveType, setLeaveType] = useState('casual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const queryClient = useQueryClient()

  const { data: myLeaves = [], isLoading: loadingMine } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaveRequests'],
    queryFn: fetchMyLeaveRequests,
    enabled: canView,
  })

  const { data: allLeaves = [], isLoading: loadingAll } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests'],
    queryFn: fetchLeaveRequests,
    enabled: canManage,
  })

  const { data: myClasses = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
    enabled: !isStudent,
  })

  const isClassTeacher = myClasses.some(c => c.isClassTeacher)

  const { data: studentLeaves = [], isLoading: loadingStudentLeaves } = useQuery<LeaveRequest[]>({
    queryKey: ['studentLeaveRequests'],
    queryFn: fetchStudentLeaveRequests,
    enabled: isClassTeacher,
  })

  const applyMutation = useMutation({
    mutationFn: () => applyLeave(leaveType, startDate, endDate, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] })
      setShowForm(false)
      setLeaveType('casual')
      setStartDate('')
      setEndDate('')
      setReason('')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reviewLeave(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['studentLeaveRequests'] })
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Apply for leave and manage leave requests</p>
        </div>
        {canView && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </button>
        )}
      </div>

      {/* Apply Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Leave Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={leaveType}
              onChange={e => setLeaveType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              {!isStudent && <option value="earned">Earned Leave</option>}
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="End Date"
            />
          </div>
          <textarea
            placeholder="Reason for leave"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => applyMutation.mutate()}
              disabled={!startDate || !endDate || !reason || applyMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Leave Requests */}
      {canView && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">My Leave Requests</h2>
          {loadingMine ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : myLeaves.length === 0 ? (
            <div className="text-center py-8">
              <CalendarOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No leave requests</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reviewed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myLeaves.map(lr => (
                    <tr key={lr.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">{leaveTypeLabel[lr.leaveType] || lr.leaveType}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.startDate}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.endDate}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{lr.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor[lr.status] || ''}`}>
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{lr.reviewedByName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Class Teacher: Student Leave Requests */}
      {isClassTeacher && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Student Leave Requests</h2>
          {loadingStudentLeaves ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : studentLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No student leave requests</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentLeaves.map(lr => (
                    <tr key={lr.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-700">{lr.userName}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.className || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{leaveTypeLabel[lr.leaveType] || lr.leaveType}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.startDate}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.endDate}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{lr.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor[lr.status] || ''}`}>
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {lr.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => reviewMutation.mutate({ id: lr.id, status: 'approved' })}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => reviewMutation.mutate({ id: lr.id, status: 'rejected' })}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{lr.reviewedByName || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin: All Leave Requests */}
      {canManage && (
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">All Leave Requests</h2>
          {loadingAll ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : allLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No leave requests</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allLeaves.map(lr => (
                    <tr key={lr.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-700">{lr.userName}</td>
                      <td className="px-5 py-3 text-gray-600">{leaveTypeLabel[lr.leaveType] || lr.leaveType}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.startDate}</td>
                      <td className="px-5 py-3 text-gray-600">{lr.endDate}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{lr.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor[lr.status] || ''}`}>
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {lr.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => reviewMutation.mutate({ id: lr.id, status: 'approved' })}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => reviewMutation.mutate({ id: lr.id, status: 'rejected' })}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{lr.reviewedByName || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
