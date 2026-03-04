import {
  Users, IndianRupee, UserCheck, Megaphone,
  CalendarCheck, ClipboardList, RefreshCw,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardNavbar } from './common/navbar'
import { ProfileCard } from './common/profile-card'
import { MenuCard } from './common/menu-card'
import { fetchCurrentUser } from '../../lib/queries/user'
import { fetchReportSummary, type ReportSummary } from '../../lib/queries/reports'

interface AdminDashboardProps {
  tenantId: string
}

export function AdminDashboard({ tenantId }: AdminDashboardProps) {
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
  })

  const { data: summary, isLoading: summaryLoading, dataUpdatedAt } = useQuery({
    queryKey: ['reportSummary'],
    queryFn: fetchReportSummary,
    refetchInterval: 30_000,
  })

  const formatCurrency = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    })

  const attendancePercent =
    summary && summary.attendanceTodayTotal > 0
      ? Math.round(
          (summary.attendanceTodayPresent / summary.attendanceTodayTotal) * 100,
        )
      : 0

  const metrics = summary
    ? [
        {
          label: 'Total Students',
          value: summary.totalStudents.toLocaleString('en-IN'),
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          iconColor: 'text-blue-500',
        },
        {
          label: 'Attendance Today',
          value:
            summary.attendanceTodayTotal > 0
              ? `${attendancePercent}%`
              : 'No data',
          sub:
            summary.attendanceTodayTotal > 0
              ? `${summary.attendanceTodayPresent} / ${summary.attendanceTodayTotal}`
              : undefined,
          icon: CalendarCheck,
          color: 'text-green-600',
          bg: 'bg-green-50',
          iconColor: 'text-green-500',
        },
        {
          label: 'Fees Pending',
          value: formatCurrency(summary.feesPending),
          icon: IndianRupee,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          iconColor: 'text-amber-500',
        },
        {
          label: 'Total Staff',
          value: summary.totalStaff.toLocaleString('en-IN'),
          icon: UserCheck,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          iconColor: 'text-purple-500',
        },
        {
          label: 'Active Notices',
          value: summary.activeNotices.toString(),
          icon: Megaphone,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          iconColor: 'text-rose-500',
        },
        {
          label: 'Fees Collected',
          value: formatCurrency(summary.feesCollected),
          icon: IndianRupee,
          color: 'text-teal-600',
          bg: 'bg-teal-50',
          iconColor: 'text-teal-500',
        },
        {
          label: 'Pending Admissions',
          value: summary.pendingAdmissions.toString(),
          icon: ClipboardList,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          iconColor: 'text-indigo-500',
        },
      ]
    : []

  return (
    <div>
      <DashboardNavbar
        title="Admin Dashboard"
        subtitle={user ? `Welcome back, ${user.name}` : 'Welcome back'}
        tenantId={tenantId}
      />

      {/* Profile + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <ProfileCard
          name={user?.name ?? 'Loading...'}
          role={user?.systemRole?.toLowerCase() ?? 'admin'}
          email={user?.email ?? ''}
          phone={user?.phone}
        />
        <MenuCard
          to="/students"
          label="Students"
          description="Manage student records, admissions, and profiles"
          icon={Users}
          color="text-blue-500"
          bg="bg-blue-50"
          count={summary ? summary.totalStudents.toLocaleString('en-IN') : '—'}
        />
        <MenuCard
          to="/attendance"
          label="Attendance"
          description="View and manage daily attendance records"
          icon={CalendarCheck}
          color="text-green-500"
          bg="bg-green-50"
          count={
            summary && summary.attendanceTodayTotal > 0
              ? `${attendancePercent}%`
              : '—'
          }
        />
        <MenuCard
          to="/plugins/payroll"
          label="Payroll"
          description="Process staff salaries, view payroll history"
          icon={IndianRupee}
          color="text-amber-500"
          bg="bg-amber-50"
          count={summary ? summary.totalStaff.toLocaleString('en-IN') : '—'}
        />
      </div>

      {/* Metrics Grid */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Overview</h3>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-gray-400">
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['reportSummary'] })
            }
            className="text-gray-400 hover:text-teal-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {summaryLoading ? (
        <div className="text-center text-sm text-gray-400 py-12">
          Loading dashboard...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {m.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${m.color}`}>
                    {m.value}
                  </p>
                  {'sub' in m && m.sub && (
                    <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                  )}
                </div>
                <div
                  className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center ${m.iconColor}`}
                >
                  <m.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
