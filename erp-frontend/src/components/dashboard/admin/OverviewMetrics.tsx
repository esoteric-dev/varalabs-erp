import {
  Users, CalendarCheck, IndianRupee, UserCheck, Megaphone, ClipboardList,
} from 'lucide-react'
import type { ReportSummary } from '../../../lib/queries/reports'

interface OverviewMetricsProps {
  summary: ReportSummary | undefined
}

export function OverviewMetrics({ summary }: OverviewMetricsProps) {
  const fmt = (v: number) => v.toLocaleString('en-IN')
  const fmtCurrency = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  const attendPct = summary && summary.attendanceTodayTotal > 0
    ? Math.round((summary.attendanceTodayPresent / summary.attendanceTodayTotal) * 100) : 0

  const metrics = [
    { label: 'Total Students', value: fmt(summary?.totalStudents || 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Attendance', value: summary?.attendanceTodayTotal ? `${attendPct}%` : 'N/A', icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Fees Pending', value: fmtCurrency(summary?.feesPending || 0), icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Staff', value: fmt(summary?.totalStaff || 0), icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Notices', value: fmt(summary?.activeNotices || 0), icon: Megaphone, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Collected', value: fmtCurrency(summary?.feesCollected || 0), icon: IndianRupee, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Pending Adm.', value: fmt(summary?.pendingAdmissions || 0), icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center ${m.color}`}>
              <m.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{m.label}</p>
        </div>
      ))}
    </div>
  )
}
