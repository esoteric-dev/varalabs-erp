import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { fetchReportSummary } from '../../lib/queries/reports'

// Widget components
import { StatCards } from './admin/StatCards'
import { TodayOverview } from './admin/TodayOverview'
import { AttendanceChart } from './admin/AttendanceChart'
import { RecentActivity } from './admin/RecentActivity'
import { SystemStatus } from './admin/SystemStatus'
import { UpcomingEvents } from './admin/UpcomingEvents'
import { QuickActions } from './admin/QuickActions'

interface AdminDashboardProps { tenantId: string }

export function AdminDashboard({ tenantId: _tenantId }: AdminDashboardProps) {
  const qc = useQueryClient()

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading, dataUpdatedAt } = useQuery({
    queryKey: ['reportSummary'], queryFn: fetchReportSummary, staleTime: 5 * 60_000,
  })

  return (
    <>
      {/* ── Stat Cards Row ────────────────────────────────────────────────── */}
      {summaryLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>
      ) : (
        <StatCards summary={summary} />
      )}

      {/* ── Today's Attendance Overview ──────────────────────────────────── */}
      <TodayOverview />

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: 2/3 width */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Attendance Chart */}
          <AttendanceChart />

          {/* Recent Activity */}
          <RecentActivity />
        </div>

        {/* Right Column: 1/3 width */}
        <div className="flex flex-col gap-6">
          {/* System Status */}
          <SystemStatus />

          {/* Upcoming Events */}
          <UpcomingEvents />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* ── Footer timestamp ──────────────────────────────────────────────── */}
      {dataUpdatedAt > 0 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400 pb-4">
          <span>Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['reportSummary'] })} className="hover:text-teal-600 transition-colors" title="Refresh">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  )
}
