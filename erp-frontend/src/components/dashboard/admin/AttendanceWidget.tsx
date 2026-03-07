import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { TimeFilterDropdown } from './TimeFilterDropdown'
import { WidgetHeader } from './WidgetHeader'
import { fetchAttendanceSummary } from '../../../lib/queries/dashboard-v2'
import type { ReportSummary } from '../../../lib/queries/reports'

const DONUT_COLORS = ['#10b981', '#f59e0b', '#ef4444']

interface AttendanceWidgetProps {
  summary: ReportSummary | undefined
}

type TabKey = 'students' | 'teachers' | 'staff'

export function AttendanceWidget({ summary }: AttendanceWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('students')
  const [period, setPeriod] = useState('today')

  const { data: attendanceSummary } = useQuery({
    queryKey: ['attendanceSummary', period],
    queryFn: () => fetchAttendanceSummary(period),
    staleTime: 2 * 60_000,
  })

  // Use API data if available, fall back to report summary
  const studentPresent = attendanceSummary?.studentPresent ?? summary?.attendanceTodayPresent ?? 0
  const studentAbsent = attendanceSummary?.studentAbsent ?? (summary ? (summary.attendanceTodayTotal - summary.attendanceTodayPresent) : 0)
  const studentLate = attendanceSummary?.studentLate ?? summary?.attendanceTodayLate ?? 0

  const tabData: Record<TabKey, { present: number; absent: number; late: number }> = {
    students: { present: studentPresent, absent: studentAbsent, late: studentLate },
    teachers: {
      present: attendanceSummary?.teacherPresent ?? 0,
      absent: attendanceSummary?.teacherAbsent ?? 0,
      late: attendanceSummary?.teacherLate ?? 0,
    },
    staff: {
      present: attendanceSummary?.staffPresent ?? 0,
      absent: attendanceSummary?.staffAbsent ?? 0,
      late: attendanceSummary?.staffLate ?? 0,
    },
  }

  const current = tabData[activeTab]
  const hasData = current.present > 0 || current.absent > 0 || current.late > 0

  const attendanceData = [
    { name: 'Present', value: current.present },
    { name: 'Late', value: current.late },
    { name: 'Absent', value: current.absent },
  ].filter(d => d.value > 0)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'students', label: 'Students' },
    { key: 'teachers', label: 'Teachers' },
    { key: 'staff', label: 'Staff' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Attendance"
        rightContent={<TimeFilterDropdown value={period} onChange={setPeriod} />}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              activeTab === tab.key
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-emerald-50">
          <p className="text-lg font-bold text-emerald-600">{current.present}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Present</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-50">
          <p className="text-lg font-bold text-red-500">{current.absent}</p>
          <p className="text-[10px] text-red-500 font-medium">Absent</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-50">
          <p className="text-lg font-bold text-amber-500">{current.late}</p>
          <p className="text-[10px] text-amber-500 font-medium">Late</p>
        </div>
      </div>

      {/* Donut */}
      {hasData ? (
        <div className="flex items-center justify-center">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={attendanceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                {attendanceData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[140px] text-gray-400 text-sm">No data</div>
      )}

      <Link to="/attendance" className="block text-center text-xs text-teal-600 hover:underline font-medium mt-3">
        View All
      </Link>
    </div>
  )
}
