import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { fetchReportSummary } from '../../lib/queries/reports'
import { fetchCurrentUser } from '../../lib/queries/user'
import {
  fetchEvents, fetchTodos, fetchNotices, fetchLeaveRequests,
  fetchActivities,
} from '../../lib/queries/dashboard'

// Widget components
import { WelcomeBanner } from './admin/WelcomeBanner'
import { ActionBar } from './admin/ActionBar'
import { StatCards } from './admin/StatCards'
import { SchedulesWidget } from './admin/SchedulesWidget'
import { AttendanceWidget } from './admin/AttendanceWidget'
import { BestPerformers } from './admin/BestPerformers'
import { QuickLinks } from './admin/QuickLinks'
import { ClassRoutineWidget } from './admin/ClassRoutineWidget'
import { PerformanceWidget } from './admin/PerformanceWidget'
import { FeesCollectionChart } from './admin/FeesCollectionChart'
import { LeaveRequestsWidget } from './admin/LeaveRequestsWidget'
import { ShortcutCards } from './admin/ShortcutCards'
import { EarningsSummary } from './admin/EarningsSummary'
import { NoticeBoard } from './admin/NoticeBoard'
import { FinancialSummary } from './admin/FinancialSummary'
import { TopSubjectsWidget } from './admin/TopSubjectsWidget'
import { StudentActivityWidget } from './admin/StudentActivityWidget'
import { TodoWidget } from './admin/TodoWidget'
import { OverviewMetrics } from './admin/OverviewMetrics'

interface AdminDashboardProps { tenantId: string }

export function AdminDashboard({ tenantId }: AdminDashboardProps) {
  const qc = useQueryClient()

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: fetchCurrentUser, staleTime: 5 * 60_000 })
  const { data: summary, isLoading: summaryLoading, dataUpdatedAt } = useQuery({
    queryKey: ['reportSummary'], queryFn: fetchReportSummary, staleTime: 5 * 60_000,
  })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: fetchEvents, staleTime: 2 * 60_000 })
  const { data: todos = [] } = useQuery({ queryKey: ['adminTodos'], queryFn: fetchTodos, staleTime: 2 * 60_000 })
  const { data: notices = [] } = useQuery({ queryKey: ['notices'], queryFn: fetchNotices, staleTime: 2 * 60_000 })
  const { data: leaves = [] } = useQuery({ queryKey: ['leaveRequests'], queryFn: fetchLeaveRequests, staleTime: 2 * 60_000 })
  const { data: activities = [] } = useQuery({ queryKey: ['studentActivities'], queryFn: fetchActivities, staleTime: 2 * 60_000 })

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtCurrency = useCallback((paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), [])

  const latestActivity = useMemo(() => activities.length > 0 ? activities[0].title : undefined, [activities])

  return (
    <div className="space-y-6">
      <DashboardNavbar
        title="Admin Dashboard"
        subtitle={user ? `Welcome back, ${user.name}` : 'Welcome back'}
        tenantId={tenantId}
      />

      {/* ── Row 1: Welcome Banner ─────────────────────────────────────────── */}
      <WelcomeBanner
        userName={user?.name || 'Admin'}
        dataUpdatedAt={dataUpdatedAt}
        latestActivity={latestActivity}
      />

      {/* ── Row 2: Action Bar ─────────────────────────────────────────────── */}
      <ActionBar />

      {/* ── Row 3: Stat Cards ─────────────────────────────────────────────── */}
      {summaryLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>
      ) : (
        <StatCards summary={summary} />
      )}

      {/* ── Row 4: Schedules | Attendance | Best Performers ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SchedulesWidget events={events} />
        <AttendanceWidget summary={summary} />
        <BestPerformers />
      </div>

      {/* ── Row 5: Quick Links | Class Routine | Performance ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QuickLinks />
        <ClassRoutineWidget />
        <PerformanceWidget />
      </div>

      {/* ── Row 6: Fees Collection Chart | Leave Requests ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FeesCollectionChart summary={summary} fmtCurrency={fmtCurrency} />
        <LeaveRequestsWidget leaves={leaves} />
      </div>

      {/* ── Row 7: Shortcut Cards ─────────────────────────────────────────── */}
      <ShortcutCards />

      {/* ── Row 8: Earnings & Expenses | Notice Board ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EarningsSummary summary={summary} />
        <NoticeBoard notices={notices} />
      </div>

      {/* ── Row 9: Financial Summary ──────────────────────────────────────── */}
      <FinancialSummary summary={summary} />

      {/* ── Row 10: Top Subjects | Student Activity ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopSubjectsWidget />
        <StudentActivityWidget activities={activities} />
      </div>

      {/* ── Row 11: Todo Widget ───────────────────────────────────────────── */}
      <TodoWidget todos={todos} />

      {/* ── Row 12: Overview Metrics ──────────────────────────────────────── */}
      <OverviewMetrics summary={summary} />

      {/* ── Footer timestamp ──────────────────────────────────────────────── */}
      {dataUpdatedAt > 0 && (
        <div className="flex items-center justify-end gap-2 text-xs text-gray-400 pb-4">
          <span>Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['reportSummary'] })} className="hover:text-teal-600 transition-colors" title="Refresh">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
