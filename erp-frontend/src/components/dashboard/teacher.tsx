import { useQuery } from '@tanstack/react-query'
import {
  Users, CalendarCheck, BookOpen, ClipboardList,
  Megaphone, CalendarOff,
} from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { MenuCard } from './common/menu-card'
import { fetchMyClasses } from '../../lib/queries/teacher'
import { fetchAssignments } from '../../lib/queries/assignments'
import { fetchMyLeaveRequests } from '../../lib/queries/leave'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { Assignment } from '../../lib/queries/assignments'
import type { LeaveRequest } from '../../lib/queries/leave'

interface TeacherDashboardProps {
  tenantId: string
}

export function TeacherDashboard({ tenantId }: TeacherDashboardProps) {
  const { data: classes = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
  })

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => fetchAssignments(),
  })

  const { data: leaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaveRequests'],
    queryFn: fetchMyLeaveRequests,
  })

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const recentAssignments = assignments.slice(0, 4)
  const classTeacherClasses = classes.filter(c => c.isClassTeacher)

  return (
    <div>
      <DashboardNavbar title="Teacher Dashboard" subtitle="Welcome back" tenantId={tenantId} />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MenuCard
          to="/attendance"
          label="Mark Attendance"
          description="Record attendance for your classes"
          icon={CalendarCheck}
          color="text-green-500"
          bg="bg-green-50"
          count={classTeacherClasses.length}
        />
        <MenuCard
          to="/my-students"
          label="My Students"
          description="View student progress and details"
          icon={Users}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <MenuCard
          to="/assignments"
          label="Assignments"
          description="Create and manage assignments"
          icon={BookOpen}
          color="text-violet-500"
          bg="bg-violet-50"
          count={assignments.length}
        />
        <MenuCard
          to="/my-payslips"
          label="My Payslips"
          description="View salary and payment history"
          icon={ClipboardList}
          color="text-amber-500"
          bg="bg-amber-50"
        />
        <MenuCard
          to="/notices"
          label="Notices"
          description="Send notices to students"
          icon={Megaphone}
          color="text-teal-500"
          bg="bg-teal-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">My Classes</h3>
            <span className="text-xs text-gray-400">{classes.length} assigned</span>
          </div>
          {classes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No classes assigned</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {classes.map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{c.className}</span>
                  {c.isClassTeacher && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-700 rounded-full">
                      Class Teacher
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Recent Assignments</h3>
            <span className="text-xs text-gray-400">{assignments.length} total</span>
          </div>
          {recentAssignments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No assignments yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentAssignments.map(a => (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-700 truncate">{a.title}</span>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full flex-shrink-0 ml-2">
                      {a.className}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {a.subject && <span>{a.subject}</span>}
                    {a.dueDate && <span>Due: {a.dueDate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">My Leave Requests</h3>
            {pendingLeaves.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full">
                {pendingLeaves.length} pending
              </span>
            )}
          </div>
          {leaves.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              <CalendarOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No leave requests
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaves.slice(0, 4).map(l => (
                <div key={l.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-700 capitalize">{l.leaveType} leave</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      l.status === 'approved' ? 'bg-green-50 text-green-700' :
                      l.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{l.startDate} to {l.endDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
