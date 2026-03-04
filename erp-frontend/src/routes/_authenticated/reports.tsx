import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, GraduationCap, IndianRupee, CalendarCheck, Megaphone, UserPlus } from 'lucide-react'
import { fetchReportSummary } from '../../lib/queries/reports'
import type { ReportSummary } from '../../lib/queries/reports'

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsPage,
})

function formatPaise(paise: number): string {
  if (paise >= 10000000) return `\u20B9${(paise / 10000000).toFixed(1)}Cr`
  if (paise >= 100000) return `\u20B9${(paise / 100000).toFixed(1)}L`
  if (paise >= 1000) return `\u20B9${(paise / 1000).toFixed(1)}K`
  return `\u20B9${(paise / 100).toFixed(0)}`
}

function ReportsPage() {
  const { data: summary, isLoading } = useQuery<ReportSummary>({
    queryKey: ['reportSummary'],
    queryFn: fetchReportSummary,
  })

  const attendancePct = summary && summary.attendanceTodayTotal > 0
    ? ((summary.attendanceTodayPresent / summary.attendanceTodayTotal) * 100).toFixed(1)
    : '0'

  const cards = summary ? [
    { label: 'Total Students', value: summary.totalStudents.toString(), icon: GraduationCap, color: 'bg-teal-50 text-teal-500' },
    { label: 'Total Staff', value: summary.totalStaff.toString(), icon: Users, color: 'bg-blue-50 text-blue-500' },
    { label: "Today's Attendance", value: `${attendancePct}%`, subtitle: `${summary.attendanceTodayPresent}/${summary.attendanceTodayTotal}`, icon: CalendarCheck, color: 'bg-green-50 text-green-500' },
    { label: 'Fees Collected', value: formatPaise(summary.feesCollected), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Fees Pending', value: formatPaise(summary.feesPending), icon: IndianRupee, color: 'bg-amber-50 text-amber-500' },
    { label: 'Pending Admissions', value: summary.pendingAdmissions.toString(), icon: UserPlus, color: 'bg-purple-50 text-purple-500' },
    { label: 'Active Notices', value: summary.activeNotices.toString(), icon: Megaphone, color: 'bg-rose-50 text-rose-500' },
  ] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Overview of key metrics and statistics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  {'subtitle' in card && card.subtitle && (
                    <p className="text-xs text-gray-400">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
