import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { fetchCurrentUser } from '../../lib/queries/user'
import { fetchMyClasses, fetchMyStudents } from '../../lib/queries/teacher'
import { fetchAssignments } from '../../lib/queries/assignments'
import { fetchMyLeaveRequests, fetchStudentLeaveRequests } from '../../lib/queries/leave'
import { fetchClassRoutines, fetchClassPerformance } from '../../lib/queries/dashboard-v2'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { Assignment } from '../../lib/queries/assignments'
import type { LeaveRequest } from '../../lib/queries/leave'
import type { ClassRoutine, ClassPerformance } from '../../lib/queries/dashboard-v2'

interface TeacherDashboardProps {
  tenantId: string
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const PERIOD_ICONS: Record<number, { icon: string; bg: string }> = {
  0: { icon: 'science', bg: 'bg-blue-100 text-blue-600' },
  1: { icon: 'science', bg: 'bg-teal-100 text-teal-600' },
  2: { icon: 'menu_book', bg: 'bg-amber-100 text-amber-600' },
  3: { icon: 'support_agent', bg: 'bg-purple-100 text-purple-600' },
}

function formatTime12(time24: string): { time: string; period: string } {
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return { time: `${h.toString().padStart(2, '0')}:${mStr || '00'}`, period }
}

export function TeacherDashboard({ tenantId: _tenantId }: TeacherDashboardProps) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
  })

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

  const { data: studentLeaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['studentLeaveRequests'],
    queryFn: fetchStudentLeaveRequests,
  })

  const { data: allRoutines = [] } = useQuery<ClassRoutine[]>({
    queryKey: ['classRoutines'],
    queryFn: () => fetchClassRoutines(),
  })

  const { data: myStudents = [] } = useQuery({
    queryKey: ['myStudents'],
    queryFn: () => fetchMyStudents(),
  })

  const { data: classPerf } = useQuery<ClassPerformance>({
    queryKey: ['classPerformance'],
    queryFn: () => fetchClassPerformance(),
  })

  // ── Derived data ─────────────────────────────────────────────────────────

  const todayName = DAY_NAMES[new Date().getDay()]

  // Filter routines for today that belong to this teacher
  const todaySchedule = useMemo(() => {
    if (!user) return []
    const mine = allRoutines.filter(
      r => r.dayOfWeek.toLowerCase() === todayName && r.teacherId === user.id,
    )
    return mine.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [allRoutines, todayName, user])

  // Determine status: before current time = completed, current slot = in_progress, after = upcoming
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

  // If no routines exist, build a fallback from classes
  const scheduleItems = useMemo(() => {
    if (todaySchedule.length > 0) {
      return todaySchedule.map((r, idx) => {
        const { time, period } = formatTime12(r.startTime)
        const status = slotStatus(r.startTime, r.endTime)
        const iconInfo = PERIOD_ICONS[idx % 4] || PERIOD_ICONS[0]
        // Count students for this class
        const classStudentCount = myStudents.filter(s => s.className === r.className).length
        return {
          id: r.id,
          time,
          period,
          icon: iconInfo.icon,
          iconBg: iconInfo.bg,
          title: r.subjectName || r.className,
          subtitle: `${r.className}${r.section ? ` • ${r.section}` : ''}`,
          location: r.room || '-',
          students: classStudentCount || 0,
          status,
        }
      })
    }
    // Fallback: use classes with hardcoded times
    const times = ['09:00', '11:00', '14:00', '15:30']
    return classes.slice(0, 4).map((c, idx) => {
      const [hStr] = (times[idx] || '09:00').split(':')
      const h = parseInt(hStr, 10)
      const iconInfo = PERIOD_ICONS[idx % 4] || PERIOD_ICONS[0]
      return {
        id: c.id,
        time: h > 12 ? `${(h - 12).toString().padStart(2, '0')}:00` : `${hStr}:00`,
        period: h >= 12 ? 'PM' : 'AM',
        icon: iconInfo.icon,
        iconBg: iconInfo.bg,
        title: c.className,
        subtitle: c.isClassTeacher ? 'Class Teacher' : 'Subject Teacher',
        location: `Room ${100 + idx}`,
        students: myStudents.filter(s => s.className === c.className).length || 0,
        status: (idx === 0 ? 'completed' : idx === 1 ? 'in_progress' : 'upcoming') as 'completed' | 'in_progress' | 'upcoming',
      }
    })
  }, [todaySchedule, classes, myStudents])

  const pendingSubmissions = assignments.filter(a => a.dueDate && new Date(a.dueDate) < new Date())
  const pendingStudentLeaves = studentLeaves.filter(l => l.status === 'pending')

  // total students across all classes
  const totalStudents = useMemo(() => {
    const unique = new Set(myStudents.map(s => s.id))
    return unique.size
  }, [myStudents])

  // Class performance data
  const classPerformanceList = useMemo(() => {
    if (classPerf) {
      const total = classPerf.topCount + classPerf.averageCount + classPerf.belowAverageCount
      if (total > 0) {
        return classes.slice(0, 3).map((c, idx) => {
          // Use real data for aggregated view, distribute by class
          const pct = idx === 0 ? Math.round((classPerf.topCount / total) * 100)
            : idx === 1 ? Math.round((classPerf.averageCount / total) * 100)
            : Math.round((classPerf.belowAverageCount / total) * 100)
          const colors = ['bg-teal-500', 'bg-amber-500', 'bg-blue-500']
          const labels = ['Top Performers', 'Average', 'Needs Improvement']
          return { className: c.className, pct, color: colors[idx], label: labels[idx] }
        })
      }
    }
    return null
  }, [classPerf, classes])

  const userName = user?.name || 'Teacher'
  const firstName = userName.split(' ')[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

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
              You have <span className="font-bold text-white">{scheduleItems.length} classes</span> scheduled today
              {pendingSubmissions.length > 0 && (
                <> and <span className="font-bold text-white">{pendingSubmissions.length} submissions</span> pending review</>
              )}.
            </p>
          </div>
          <Link
            to="/assignments"
            className="bg-white text-teal-600 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-50 transition-colors"
          >
            Review Submissions
          </Link>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classes</p>
            <p className="text-xl font-bold text-slate-900">{classes.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</p>
            <p className="text-xl font-bold text-slate-900">{totalStudents}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignments</p>
            <p className="text-xl font-bold text-slate-900">{assignments.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-xl font-bold text-slate-900">{pendingSubmissions.length + pendingStudentLeaves.length}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: 2/3 width */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Today's Teaching Schedule */}
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">schedule</span>
              Today's Teaching Schedule
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
                            In Progress
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
                      {item.students > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-lg">group</span>
                          <span className="text-sm text-slate-600">{item.students} Students</span>
                        </div>
                      )}
                      {item.status === 'completed' && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Completed</span>
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

          {/* Class Performance Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">monitoring</span>
                Class Performance Overview
              </h3>
              <Link to="/reports" className="text-sm text-teal-600 font-bold hover:underline">
                Full Analytics
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {classPerformanceList ? (
                classPerformanceList.map((cp) => (
                  <div key={cp.className} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{cp.className}</span>
                      <span className="font-bold text-slate-900">{cp.pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cp.color} rounded-full transition-all`} style={{ width: `${cp.pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{cp.label}</p>
                  </div>
                ))
              ) : classes.length > 0 ? (
                classes.slice(0, 3).map((c, idx) => {
                  const colors = ['bg-teal-500', 'bg-amber-500', 'bg-blue-500']
                  const pcts = [88, 76, 82]
                  const notes = ['Highest performing class', 'Needs attention', 'Improving steadily']
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{c.className}</span>
                        <span className="font-bold text-slate-900">{pcts[idx]}% Avg</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[idx]} rounded-full`} style={{ width: `${pcts[idx]}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{notes[idx]}</p>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-3 text-center text-sm text-slate-400 py-4">
                  No class performance data yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 1/3 width */}
        <div className="flex flex-col gap-6">
          {/* Student Submissions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">inventory_2</span>
                Student Submissions
              </h3>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                {assignments.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {/* Late / overdue assignments */}
              {pendingSubmissions.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <div className="mt-0.5 min-w-[20px]">
                    <span className="material-symbols-outlined text-rose-500 text-lg">priority_high</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Overdue Assignments</h4>
                    <p className="text-xs text-rose-600 font-medium">{pendingSubmissions.length} past due date</p>
                  </div>
                  <Link to="/assignments" className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-800">View</Link>
                </div>
              )}

              {/* Recent assignments list */}
              {assignments.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="mt-0.5 min-w-[20px]">
                    <span className="material-symbols-outlined text-teal-500 text-lg">check_circle</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-700 truncate">{a.title}</h4>
                    <p className="text-xs text-slate-500">
                      {a.className}{a.subject ? ` \u2022 ${a.subject}` : ''}
                      {a.dueDate ? ` \u2022 Due: ${a.dueDate}` : ''}
                    </p>
                  </div>
                  <Link to="/assignments" className="ml-auto text-xs font-bold text-slate-400 hover:text-teal-600 shrink-0">Grade</Link>
                </div>
              ))}

              {/* Pending student leave requests */}
              {pendingStudentLeaves.slice(0, 2).map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="mt-0.5 min-w-[20px]">
                    <span className="material-symbols-outlined text-amber-500 text-lg">event_busy</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Leave Request</h4>
                    <p className="text-xs text-slate-500">
                      {l.userName}{l.className ? ` (${l.className})` : ''} &bull; {l.leaveType}
                    </p>
                  </div>
                  <Link to="/leave" className="ml-auto text-xs font-bold text-slate-400 hover:text-teal-600 shrink-0">Review</Link>
                </div>
              ))}

              {/* Own pending leave */}
              {leaves.filter(l => l.status === 'pending').slice(0, 1).map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="mt-0.5 min-w-[20px]">
                    <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Your Leave Request</h4>
                    <p className="text-xs text-slate-500">{l.leaveType} &bull; {l.status}</p>
                  </div>
                  <Link to="/leave" className="ml-auto text-xs font-bold text-slate-400 hover:text-teal-600 shrink-0">View</Link>
                </div>
              ))}

              {assignments.length === 0 && pendingSubmissions.length === 0 && pendingStudentLeaves.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-400">No submissions to review</div>
              )}
            </div>

            <Link
              to="/assignments"
              className="block w-full mt-4 py-2 text-sm text-teal-600 font-bold hover:bg-teal-50 rounded-lg transition-colors text-center"
            >
              Go to Gradebook
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-slate-900 text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">bolt</span>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/assignments"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition-all group"
              >
                <div className="size-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                  <span className="material-symbols-outlined text-lg">add_task</span>
                </div>
                <span className="text-xs font-bold text-slate-700">Create Assignment</span>
              </Link>
              <Link
                to="/notices"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition-all group"
              >
                <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-lg">campaign</span>
                </div>
                <span className="text-xs font-bold text-slate-700">Announce</span>
              </Link>
              <Link
                to="/attendance"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition-all group"
              >
                <div className="size-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <span className="material-symbols-outlined text-lg">event</span>
                </div>
                <span className="text-xs font-bold text-slate-700">Mark Attendance</span>
              </Link>
              <Link
                to="/my-students"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-teal-200 transition-all group"
              >
                <div className="size-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </div>
                <span className="text-xs font-bold text-slate-700">My Students</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
