import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck, BookOpen, IndianRupee, Megaphone,
  CalendarOff, User,
} from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { MenuCard } from './common/menu-card'
import { fetchMyStudent } from '../../lib/queries/students'
import { fetchAttendanceRecords } from '../../lib/queries/attendance'
import { fetchFeeRecords } from '../../lib/queries/fees'
import { fetchAssignments } from '../../lib/queries/assignments'
import { fetchMyLeaveRequests } from '../../lib/queries/leave'
import type { Student } from '../../lib/queries/students'
import type { AttendanceRecord } from '../../lib/queries/attendance'
import type { FeeRecord } from '../../lib/queries/fees'
import type { Assignment } from '../../lib/queries/assignments'
import type { LeaveRequest } from '../../lib/queries/leave'

interface StudentDashboardProps {
  tenantId: string
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}

export function StudentDashboard({ tenantId }: StudentDashboardProps) {
  const { data: student } = useQuery<Student | null>({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
  })

  const studentId = student?.id

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceRecords', 'student', studentId],
    queryFn: () => fetchAttendanceRecords(undefined, studentId!),
    enabled: !!studentId,
  })

  const { data: feeRecords = [] } = useQuery<FeeRecord[]>({
    queryKey: ['feeRecords', studentId],
    queryFn: () => fetchFeeRecords(studentId!),
    enabled: !!studentId,
  })

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments', student?.className],
    queryFn: () => fetchAssignments(student?.className),
    enabled: !!student?.className,
  })

  const { data: leaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaveRequests'],
    queryFn: fetchMyLeaveRequests,
  })

  // Attendance stats
  const totalAttendance = attendance.length
  const presentCount = attendance.filter(r => r.status === 'present').length
  const attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '-'

  // Fee stats
  const totalPaid = feeRecords.reduce((sum, r) => sum + r.amountPaid, 0)
  const totalPending = feeRecords
    .filter(r => ['pending', 'partial', 'overdue'].includes(r.status))
    .reduce((sum, r) => sum + (r.amountDue - r.amountPaid), 0)

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const recentAssignments = assignments.slice(0, 4)

  const feeStatusColors: Record<string, string> = {
    paid: 'bg-green-50 text-green-700',
    partial: 'bg-amber-50 text-amber-700',
    pending: 'bg-yellow-50 text-yellow-700',
    overdue: 'bg-red-50 text-red-700',
    waived: 'bg-gray-50 text-gray-500',
  }

  return (
    <div>
      <DashboardNavbar
        title="Student Dashboard"
        subtitle={student ? `Welcome back, ${student.name.split(' ')[0]}` : 'Welcome back'}
        tenantId={tenantId}
      />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MenuCard
          to="/attendance"
          label="My Attendance"
          description="View your attendance records"
          icon={CalendarCheck}
          color="text-green-500"
          bg="bg-green-50"
          count={attendanceRate !== '-' ? `${attendanceRate}%` : undefined}
        />
        {studentId && (
          <MenuCard
            to={`/students/${studentId}`}
            label="My Profile"
            description="View your details and records"
            icon={User}
            color="text-blue-500"
            bg="bg-blue-50"
          />
        )}
        <MenuCard
          to="/assignments"
          label="Assignments"
          description="View your class assignments"
          icon={BookOpen}
          color="text-violet-500"
          bg="bg-violet-50"
          count={assignments.length}
        />
        <MenuCard
          to="/notices"
          label="Notices"
          description="View school announcements"
          icon={Megaphone}
          color="text-teal-500"
          bg="bg-teal-50"
        />
        <MenuCard
          to="/leave"
          label="Leave"
          description="Apply for leave"
          icon={CalendarOff}
          color="text-amber-500"
          bg="bg-amber-50"
          count={pendingLeaves.length > 0 ? `${pendingLeaves.length} pending` : undefined}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Attendance</p>
              <p className="text-xl font-bold text-gray-900">{attendanceRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Fees Paid</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Fees Pending</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Fee Records */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">My Fees</h3>
            <span className="text-xs text-gray-400">{feeRecords.length} records</span>
          </div>
          {feeRecords.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              <IndianRupee className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No fee records
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {feeRecords.slice(0, 4).map(f => (
                <div key={f.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-700">{f.feeName}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${feeStatusColors[f.status] || 'bg-gray-50 text-gray-600'}`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Due: {formatPaise(f.amountDue)}</span>
                    <span>Paid: {formatPaise(f.amountPaid)}</span>
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
