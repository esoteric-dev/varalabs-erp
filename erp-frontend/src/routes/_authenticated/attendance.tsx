import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { CalendarCheck, Users, UserX, Clock, CalendarOff, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { fetchAttendanceRecords, bulkMarkAttendance } from '../../lib/queries/attendance'
import { fetchMyClasses } from '../../lib/queries/teacher'
import { fetchMyStudent } from '../../lib/queries/students'
import type { AttendanceRecord } from '../../lib/queries/attendance'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/attendance')({
  component: AttendancePage,
})

const statusColor: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-700',
  late: 'bg-amber-50 text-amber-700',
  excused: 'bg-blue-50 text-blue-700',
  leave: 'bg-purple-50 text-purple-700',
  unmarked: 'bg-gray-50 text-gray-400',
}

const calendarStatusBg: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-amber-500',
  excused: 'bg-blue-500',
  leave: 'bg-purple-500',
}

function AttendancePage() {
  const { myRoles } = Route.useRouteContext()
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')

  if (isStudent) {
    return <StudentAttendanceView />
  }
  return <TeacherAttendanceView />
}

function StudentAttendanceView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const { data: myStudent } = useQuery({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
  })

  const studentId = myStudent?.id

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceRecords', 'student', studentId],
    queryFn: () => fetchAttendanceRecords(undefined, studentId!),
    enabled: !!studentId,
  })

  // Build a map of date -> status for calendar rendering
  const dateStatusMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of records) {
      map[r.date] = r.status
    }
    return map
  }, [records])

  // Filter records to current month for stats
  const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`
  const monthRecords = records.filter(r => r.date.startsWith(monthStr))
  const totalMonth = monthRecords.length
  const presentMonth = monthRecords.filter(r => r.status === 'present').length
  const absentMonth = monthRecords.filter(r => r.status === 'absent').length
  const lateMonth = monthRecords.filter(r => r.status === 'late').length
  const rateMonth = totalMonth > 0 ? ((presentMonth / totalMonth) * 100).toFixed(1) : '-'

  // Overall stats
  const totalAll = records.length
  const presentAll = records.filter(r => r.status === 'present').length
  const rateAll = totalAll > 0 ? ((presentAll / totalAll) * 100).toFixed(1) : '-'

  // Calendar grid
  const firstDay = new Date(currentMonth.year, currentMonth.month, 1)
  const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0)
  const startDayOfWeek = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: prev.month - 1 }
    })
  }

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {myStudent ? `${myStudent.name} - Class ${myStudent.className}` : 'Your attendance records'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Overall Attendance</p>
          <p className="text-xl font-bold text-gray-900">{rateAll}%</p>
          <p className="text-xs text-gray-400">{presentAll}/{totalAll} days present</p>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">This Month</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{rateMonth}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Present</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{presentMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Absent</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{absentMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Late</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{lateMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Days Recorded</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{totalMonth}</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h3 className="text-sm font-semibold text-gray-800">{monthName}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const status = dateStatusMap[dateStr]
                const isToday = dateStr === new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative ${
                      isToday ? 'ring-2 ring-teal-400' : ''
                    } ${status ? 'cursor-default' : ''}`}
                    title={status ? `${dateStr}: ${status}` : dateStr}
                  >
                    <span className={`text-xs font-medium ${status ? 'text-gray-700' : 'text-gray-300'}`}>
                      {day}
                    </span>
                    {status && (
                      <div className={`w-2 h-2 rounded-full mt-0.5 ${calendarStatusBg[status] || 'bg-gray-400'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4">
          {[
            { label: 'Present', color: 'bg-green-500' },
            { label: 'Absent', color: 'bg-red-500' },
            { label: 'Late', color: 'bg-amber-500' },
            { label: 'Leave', color: 'bg-purple-500' },
            { label: 'Excused', color: 'bg-blue-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Records List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Attendance History</h3>
        </div>
        {monthRecords.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No attendance records for {monthName}
          </div>
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
              {monthRecords.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-700">{r.date}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColor[r.status] || 'bg-gray-50 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function TeacherAttendanceView() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const { data: classes = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
  })

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceRecords', selectedDate, selectedClass],
    queryFn: () => fetchAttendanceRecords(selectedDate, undefined, selectedClass || undefined),
  })

  // Reset local statuses when records change (date/class switch)
  useEffect(() => {
    setLocalStatuses({})
  }, [selectedDate, selectedClass])

  const bulkMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(localStatuses)
        .filter(([sid, status]) => {
          const server = records.find(r => r.studentId === sid)
          return server && server.status !== status
        })
        .map(([studentId, status]) => ({ studentId, status }))
      return bulkMarkAttendance(selectedDate, entries)
    },
    onSuccess: () => {
      setLocalStatuses({})
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords', selectedDate, selectedClass] })
    },
  })

  const getEffectiveStatus = (r: AttendanceRecord) => localStatuses[r.studentId] ?? r.status

  const changedCount = Object.entries(localStatuses).filter(([sid, status]) => {
    const server = records.find(r => r.studentId === sid)
    return server && server.status !== status
  }).length

  const total = records.length
  const effectiveStatuses = records.map(r => getEffectiveStatus(r))
  const unmarked = effectiveStatuses.filter(s => s === 'unmarked').length
  const marked = total - unmarked
  const present = effectiveStatuses.filter(s => s === 'present').length
  const absent = effectiveStatuses.filter(s => s === 'absent').length
  const onLeave = effectiveStatuses.filter(s => s === 'leave').length
  const late = effectiveStatuses.filter(s => s === 'late').length
  const rate = marked > 0 ? ((present / marked) * 100).toFixed(1) : '-'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
          <p className="text-sm text-gray-500 mt-0.5">Daily attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          {classes.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.className}>{c.className}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Total</p>
              <p className="text-xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Present</p>
              <p className="text-xl font-bold text-gray-900">{present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Absent</p>
              <p className="text-xl font-bold text-gray-900">{absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">On Leave</p>
              <p className="text-xl font-bold text-gray-900">{onLeave}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Rate</p>
              <p className="text-xl font-bold text-gray-900">{rate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Records for {selectedDate}{selectedClass && ` - ${selectedClass}`}
          </h3>
          <div className="flex items-center gap-3">
            {unmarked > 0 && (
              <span className="text-xs text-gray-400 font-medium">{unmarked} unmarked</span>
            )}
            {late > 0 && (
              <span className="text-xs text-amber-600 font-medium">{late} late</span>
            )}
            {changedCount > 0 && (
              <button
                onClick={() => bulkMutation.mutate()}
                disabled={bulkMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {bulkMutation.isPending ? 'Saving...' : `Save (${changedCount})`}
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No students found{selectedClass ? ` in ${selectedClass}` : ''}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => {
                const effective = getEffectiveStatus(r)
                const isChanged = localStatuses[r.studentId] !== undefined && localStatuses[r.studentId] !== r.status
                return (
                  <tr key={r.studentId} className={`transition-colors ${isChanged ? 'bg-teal-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{r.studentName}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColor[effective] || 'bg-gray-50 text-gray-600'}`}
                      >
                        {effective}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{r.remarks || '-'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {['present', 'absent', 'late', 'leave'].map(status => (
                          <button
                            key={status}
                            onClick={() => setLocalStatuses(prev => ({ ...prev, [r.studentId]: status }))}
                            className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                              effective === status
                                ? statusColor[status]
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
