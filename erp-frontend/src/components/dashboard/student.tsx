import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { fetchCurrentUser } from '../../lib/queries/user'
import { fetchMyStudent } from '../../lib/queries/students'
import { fetchAttendanceRecords } from '../../lib/queries/attendance'
import { fetchFeeRecords } from '../../lib/queries/fees'
import { fetchAssignments } from '../../lib/queries/assignments'
import { fetchMyLeaveRequests } from '../../lib/queries/leave'
import { fetchClassRoutines } from '../../lib/queries/dashboard-v2'
import { fetchSubjects } from '../../lib/queries/dashboard'
import { fetchMyMarks } from '../../lib/queries/marks'
import type { StudentMark } from '../../lib/queries/marks'
import type { Student } from '../../lib/queries/students'
import type { AttendanceRecord } from '../../lib/queries/attendance'
import type { Assignment } from '../../lib/queries/assignments'
import type { LeaveRequest } from '../../lib/queries/leave'
import type { ClassRoutine } from '../../lib/queries/dashboard-v2'

interface StudentDashboardProps {
  tenantId: string
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const SUBJECT_ICONS: Record<string, { icon: string; bg: string }> = {
  math: { icon: 'calculate', bg: 'bg-blue-100 text-blue-600' },
  mathematics: { icon: 'calculate', bg: 'bg-blue-100 text-blue-600' },
  physics: { icon: 'science', bg: 'bg-teal-100 text-teal-600' },
  chemistry: { icon: 'science', bg: 'bg-green-100 text-green-600' },
  biology: { icon: 'biotech', bg: 'bg-emerald-100 text-emerald-600' },
  history: { icon: 'public', bg: 'bg-amber-100 text-amber-600' },
  english: { icon: 'book_2', bg: 'bg-purple-100 text-purple-600' },
  hindi: { icon: 'translate', bg: 'bg-orange-100 text-orange-600' },
  science: { icon: 'science', bg: 'bg-teal-100 text-teal-600' },
  computer: { icon: 'computer', bg: 'bg-indigo-100 text-indigo-600' },
}

function getSubjectIcon(name: string): { icon: string; bg: string } {
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(SUBJECT_ICONS)) {
    if (lower.includes(key)) return val
  }
  return { icon: 'menu_book', bg: 'bg-slate-100 text-slate-600' }
}

function formatTime12(time24: string): { time: string; period: string } {
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return { time: `${h.toString().padStart(2, '0')}:${mStr || '00'}`, period }
}

export function StudentDashboard({ tenantId: _tenantId }: StudentDashboardProps) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
  })

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

  const { data: feeRecords = [] } = useQuery({
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

  const { data: allRoutines = [] } = useQuery<ClassRoutine[]>({
    queryKey: ['classRoutines', student?.className],
    queryFn: () => fetchClassRoutines(student?.className),
    enabled: !!student?.className,
  })

  const { data: _subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjects,
  })

  const { data: myMarks = [] } = useQuery<StudentMark[]>({
    queryKey: ['myMarks'],
    queryFn: () => fetchMyMarks(),
  })

  // ── Derived data ─────────────────────────────────────────────────────────

  // Attendance stats
  const totalAttendance = attendance.length
  const presentCount = attendance.filter(r => r.status === 'present').length
  const lateCount = attendance.filter(r => r.status === 'late').length
  const absentCount = attendance.filter(r => r.status === 'absent').length
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

  // Fee stats
  const totalPending = feeRecords
    .filter(r => ['pending', 'partial', 'overdue'].includes(r.status))
    .reduce((sum: number, r: any) => sum + (r.amountDue - r.amountPaid), 0)

  // Today's schedule
  const todayName = DAY_NAMES[new Date().getDay()]
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  function slotStatus(startTime: string, endTime: string): 'completed' | 'in_progress' | 'upcoming' {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const start = sh * 60 + (sm || 0)
    const end = eh * 60 + (em || 0)
    if (currentMinutes >= end) return 'completed'
    if (currentMinutes >= start && currentMinutes < end) return 'in_progress'
    return 'upcoming'
  }

  const todaySchedule = useMemo(() => {
    return allRoutines
      .filter(r => r.dayOfWeek.toLowerCase() === todayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [allRoutines, todayName])

  const scheduleItems = useMemo(() => {
    return todaySchedule.map(r => {
      const { time, period } = formatTime12(r.startTime)
      const status = slotStatus(r.startTime, r.endTime)
      const { icon, bg } = getSubjectIcon(r.subjectName || r.className)
      return {
        id: r.id,
        time,
        period,
        icon,
        iconBg: bg,
        title: r.subjectName || r.className,
        subtitle: r.className + (r.section ? ` • ${r.section}` : ''),
        location: r.room || '-',
        teacher: r.teacherName,
        status,
      }
    })
  }, [todaySchedule])

  // Upcoming assignments (sorted by due date)
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [assignments])

  const todayStr = now.toISOString().split('T')[0]
  const dueTodayCount = assignments.filter(a => a.dueDate === todayStr).length
  const overdueCount = assignments.filter(a => a.dueDate && a.dueDate < todayStr).length
  const pendingLeaves = leaves.filter(l => l.status === 'pending')

  // Subject progress from real marks data (averaged per subject across all exams)
  const subjectProgressBars = useMemo(() => {
    const colors = ['bg-teal-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-rose-500']
    if (myMarks.length === 0) {
      return []
    }
    // Group marks by subject and compute average percentage
    const subjectMap = new Map<string, { name: string; totalObtained: number; totalMax: number }>()
    for (const m of myMarks) {
      const existing = subjectMap.get(m.subjectId)
      if (existing) {
        existing.totalObtained += m.marksObtained
        existing.totalMax += m.totalMarks
      } else {
        subjectMap.set(m.subjectId, { name: m.subjectName, totalObtained: m.marksObtained, totalMax: m.totalMarks })
      }
    }
    return Array.from(subjectMap.values())
      .map((s, idx) => ({
        name: s.name,
        pct: s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0,
        color: colors[idx % colors.length],
      }))
      .slice(0, 6)
  }, [myMarks])

  // Overall average from real marks
  const overallAverage = useMemo(() => {
    if (myMarks.length === 0) return null
    const totalObtained = myMarks.reduce((s, m) => s + m.marksObtained, 0)
    const totalMax = myMarks.reduce((s, m) => s + m.totalMarks, 0)
    return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0
  }, [myMarks])

  const userName = user?.name || student?.name || 'Student'
  const firstName = userName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function formatPaise(paise: number): string {
    return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
  }

  function formatDueLabel(dueDate: string | null): { label: string; urgent: boolean } {
    if (!dueDate) return { label: 'No due date', urgent: false }
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`, urgent: true }
    if (diff === 0) return { label: 'Due Today', urgent: true }
    if (diff === 1) return { label: 'Due Tomorrow', urgent: false }
    return { label: `Due ${dueDate}`, urgent: false }
  }

  return (
    <>
      {/* ── Welcome Banner ────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-xl p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{greeting}, {firstName}!</h2>
            <p className="text-teal-50 font-medium max-w-md">
              {dueTodayCount > 0 ? (
                <>You have <span className="font-bold text-white">{dueTodayCount} assignment{dueTodayCount > 1 ? 's' : ''}</span> due today</>
              ) : overdueCount > 0 ? (
                <>You have <span className="font-bold text-white">{overdueCount} overdue assignment{overdueCount > 1 ? 's' : ''}</span> to submit</>
              ) : (
                <>You have <span className="font-bold text-white">{scheduleItems.length} classes</span> scheduled today</>
              )}
              {totalPending > 0 && (
                <> and <span className="font-bold text-white">{formatPaise(totalPending)}</span> in pending fees</>
              )}.
            </p>
          </div>
          <Link
            to="/assignments"
            className="bg-white text-teal-600 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-50 transition-colors"
          >
            Check Assignments
          </Link>
        </div>
      </div>

      {/* ── Dashboard Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: 2/3 width */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Today's Classes */}
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">schedule</span>
              Today's Classes
            </h3>
            <span className="text-sm text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
              {new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {scheduleItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No classes scheduled today</div>
            ) : (
              scheduleItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`group flex items-stretch ${idx < scheduleItems.length - 1 ? 'border-b border-slate-50' : ''} ${
                    item.status === 'in_progress'
                      ? 'bg-teal-50/30 border-l-4 border-l-teal-500'
                      : 'hover:bg-slate-50 transition-colors'
                  }`}
                >
                  <div className={`w-20 md:w-24 p-4 flex flex-col items-center justify-center border-r border-slate-50 ${
                    item.status === 'in_progress' ? '' : 'bg-slate-50/50 group-hover:bg-teal-50/30'
                  }`}>
                    <span className={`text-sm font-bold ${item.status === 'in_progress' ? 'text-teal-700' : 'text-slate-900'}`}>
                      {item.time}
                    </span>
                    <span className={`text-xs ${item.status === 'in_progress' ? 'text-teal-600' : 'text-slate-500'}`}>
                      {item.period}
                    </span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className={`size-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 ${
                      item.status === 'in_progress' ? 'animate-pulse' : ''
                    }`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">
                        {item.title}
                        {item.status === 'in_progress' && (
                          <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wide align-middle">
                            Now
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 md:mt-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {item.location}
                      </div>
                      {item.teacher && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                          <span className="text-sm text-slate-600">{item.teacher}</span>
                        </div>
                      )}
                      {item.status === 'completed' && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Present</span>
                      )}
                      {item.status === 'upcoming' && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500">Upcoming</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Attendance Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">event_available</span>
                Attendance Overview
              </h3>
              <Link to="/attendance" className="text-sm text-teal-600 font-bold hover:underline">
                Full Report
              </Link>
            </div>
            {totalAttendance > 0 ? (
              <>
                <div className="flex gap-1 mb-2">
                  {presentCount > 0 && (
                    <div
                      className="h-4 bg-green-500 rounded-l-full relative group"
                      style={{ flex: presentCount }}
                    >
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        Present: {presentCount} days
                      </div>
                    </div>
                  )}
                  {lateCount > 0 && (
                    <div
                      className="h-4 bg-amber-400 relative group"
                      style={{ flex: lateCount }}
                    >
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        Late: {lateCount} days
                      </div>
                    </div>
                  )}
                  {absentCount > 0 && (
                    <div
                      className="h-4 bg-rose-500 rounded-r-full relative group"
                      style={{ flex: absentCount }}
                    >
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        Absent: {absentCount} days
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                  <span>{attendanceRate}% attendance rate</span>
                  <span>{totalAttendance} days recorded</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-slate-400">No attendance records yet</div>
            )}
          </div>
        </div>

        {/* Right Column: 1/3 width */}
        <div className="flex flex-col gap-6">
          {/* Academic Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-slate-900 text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">monitoring</span>
              Academic Progress
            </h3>
            {subjectProgressBars.length > 0 ? (
              <>
                <div className="space-y-4">
                  {subjectProgressBars.map(s => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{s.name}</span>
                        <span className="font-bold text-slate-900">{s.pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {overallAverage !== null && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full border-4 border-teal-100 border-t-teal-500 flex items-center justify-center bg-white">
                        <span className="text-xs font-bold text-slate-900">
                          {overallAverage >= 90 ? 'A' : overallAverage >= 75 ? 'B' : overallAverage >= 60 ? 'C' : 'D'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Overall Grade</p>
                        <p className="text-lg font-bold text-slate-900">
                          {overallAverage >= 90 ? 'Excellent' : overallAverage >= 75 ? 'Good' : overallAverage >= 60 ? 'Average' : 'Needs Improvement'}
                        </p>
                        <p className="text-xs text-slate-400">{overallAverage}% average</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">No marks recorded yet</div>
            )}
          </div>

          {/* Tasks / Assignments */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">task_alt</span>
                Tasks
              </h3>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                {assignments.length} Total
              </span>
            </div>
            <div className="space-y-3">
              {/* Overdue / urgent assignments */}
              {sortedAssignments.filter(a => {
                const d = formatDueLabel(a.dueDate)
                return d.urgent
              }).slice(0, 2).map(a => {
                const { label } = formatDueLabel(a.dueDate)
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <div className="mt-0.5 min-w-[20px]">
                      <span className="material-symbols-outlined text-rose-500 text-lg">warning</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                      <p className="text-xs text-rose-600 font-medium">{label}</p>
                    </div>
                  </div>
                )
              })}

              {/* Upcoming assignments */}
              {sortedAssignments.filter(a => {
                const d = formatDueLabel(a.dueDate)
                return !d.urgent
              }).slice(0, 3).map(a => {
                const { label } = formatDueLabel(a.dueDate)
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="mt-0.5 min-w-[20px]">
                      <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">{a.title}</h4>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  </div>
                )
              })}

              {/* Pending leave requests */}
              {pendingLeaves.slice(0, 1).map(l => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="mt-0.5 min-w-[20px]">
                    <span className="material-symbols-outlined text-amber-500 text-lg">event_busy</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Leave: {l.leaveType}</h4>
                    <p className="text-xs text-amber-600 font-medium">{l.startDate} to {l.endDate} &bull; {l.status}</p>
                  </div>
                </div>
              ))}

              {assignments.length === 0 && pendingLeaves.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-400">No tasks right now</div>
              )}
            </div>
            <Link
              to="/assignments"
              className="block w-full mt-4 py-2 text-sm text-teal-600 font-bold hover:bg-teal-50 rounded-lg transition-colors text-center"
            >
              View All Assignments
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
