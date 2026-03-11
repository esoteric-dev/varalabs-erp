import { useQuery } from '@tanstack/react-query'
import { fetchAttendanceSummary } from '../../../lib/queries/dashboard-v2'

export function TodayOverview() {
  const { data: attendance } = useQuery({
    queryKey: ['attendanceSummary', 'today'],
    queryFn: () => fetchAttendanceSummary('today'),
    staleTime: 2 * 60_000,
  })

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const studentRate =
    attendance && attendance.studentTotal > 0
      ? Math.round((attendance.studentPresent / attendance.studentTotal) * 100)
      : 0
  const staffRate =
    attendance && attendance.staffTotal > 0
      ? Math.round((attendance.staffPresent / attendance.staffTotal) * 100)
      : 0

  const groups = [
    {
      label: 'Students',
      present: attendance?.studentPresent ?? 0,
      absent: attendance?.studentAbsent ?? 0,
      late: attendance?.studentLate ?? 0,
      total: attendance?.studentTotal ?? 0,
      rate: studentRate,
      color: 'teal',
      icon: 'school',
    },
    {
      label: 'Teachers',
      present: attendance?.teacherPresent ?? 0,
      absent: attendance?.teacherAbsent ?? 0,
      late: attendance?.teacherLate ?? 0,
      total: attendance?.teacherTotal ?? 0,
      rate:
        attendance && attendance.teacherTotal > 0
          ? Math.round((attendance.teacherPresent / attendance.teacherTotal) * 100)
          : 0,
      color: 'blue',
      icon: 'person',
    },
    {
      label: 'Staff',
      present: attendance?.staffPresent ?? 0,
      absent: attendance?.staffAbsent ?? 0,
      late: attendance?.staffLate ?? 0,
      total: attendance?.staffTotal ?? 0,
      rate: staffRate,
      color: 'purple',
      icon: 'badge',
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500">today</span>
            Today&apos;s Overview
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{today}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((g) => {
          const colorMap: Record<string, { ring: string; text: string; bg: string; track: string }> = {
            teal: { ring: 'text-teal-500', text: 'text-teal-600', bg: 'bg-teal-50', track: 'text-slate-100' },
            blue: { ring: 'text-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', track: 'text-slate-100' },
            purple: { ring: 'text-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', track: 'text-slate-100' },
          }
          const c = colorMap[g.color] ?? colorMap.teal

          return (
            <div key={g.label} className="border border-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`size-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${c.text} text-xl`}>{g.icon}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{g.label}</h4>
                  <p className="text-xs text-slate-400">{g.total} total</p>
                </div>
              </div>

              {/* Circular progress */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative size-16 shrink-0">
                  <svg className="size-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className={c.track}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={c.ring}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${g.rate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${c.text}`}>{g.rate}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Present</span>
                    <span className="text-xs font-bold text-green-600">{g.present}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Absent</span>
                    <span className="text-xs font-bold text-rose-600">{g.absent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Late</span>
                    <span className="text-xs font-bold text-amber-600">{g.late}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
