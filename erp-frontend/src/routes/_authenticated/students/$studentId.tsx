import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarCheck, IndianRupee } from 'lucide-react'
import { fetchStudent } from '../../../lib/queries/students'
import { fetchAttendanceRecords } from '../../../lib/queries/attendance'
import { fetchFeeRecords } from '../../../lib/queries/fees'
import type { AttendanceRecord } from '../../../lib/queries/attendance'
import type { FeeRecord } from '../../../lib/queries/fees'

export const Route = createFileRoute('/_authenticated/students/$studentId')({
  component: StudentProfile,
})

function formatPaise(paise: number): string {
  if (paise >= 10000000) return `\u20B9${(paise / 10000000).toFixed(1)}Cr`
  if (paise >= 100000) return `\u20B9${(paise / 100000).toFixed(1)}L`
  if (paise >= 1000) return `\u20B9${(paise / 1000).toFixed(1)}K`
  return `\u20B9${(paise / 100).toFixed(0)}`
}

const statusColor: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-700',
  late: 'bg-amber-50 text-amber-700',
  excused: 'bg-blue-50 text-blue-700',
}

const feeStatusColor: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  pending: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  waived: 'bg-gray-50 text-gray-600',
}

function StudentProfile() {
  const { studentId } = Route.useParams()

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => fetchStudent(studentId),
  })

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceRecords', 'student', studentId],
    queryFn: () => fetchAttendanceRecords(undefined, studentId),
  })

  const { data: feeRecords = [] } = useQuery<FeeRecord[]>({
    queryKey: ['feeRecords', studentId],
    queryFn: () => fetchFeeRecords(studentId),
  })

  // Attendance stats
  const totalAttendance = attendance.length
  const presentCount = attendance.filter(r => r.status === 'present').length
  const attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '-'

  // Fee stats
  const totalDue = feeRecords.reduce((sum, r) => sum + r.amountDue, 0)
  const totalPaid = feeRecords.reduce((sum, r) => sum + r.amountPaid, 0)
  const pendingAmount = totalDue - totalPaid

  if (loadingStudent) {
    return (
      <div>
        <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
        <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
        <div className="py-8 text-center text-sm text-gray-400">Student not found</div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-5">
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {student.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Class {student.className} &middot; ID: {studentId}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Days Recorded</p>
              <p className="text-xl font-bold text-gray-900">{totalAttendance}</p>
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
              <p className="text-xs font-semibold text-gray-400 uppercase">Pending</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Records */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Fee Records</h3>
          </div>
          {feeRecords.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No fee records</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Fee</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Due</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feeRecords.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-800">{f.feeName}</div>
                      <div className="text-xs text-gray-400">Due: {f.dueDate}</div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatPaise(f.amountDue)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatPaise(f.amountPaid)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${feeStatusColor[f.status] || 'bg-gray-50 text-gray-600'}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Attendance History</h3>
          </div>
          {attendance.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No attendance records</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-700">{a.date}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColor[a.status] || 'bg-gray-50 text-gray-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{a.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
