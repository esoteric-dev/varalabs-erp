import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router'
import {
  LayoutDashboard, Users, CalendarCheck, Wallet, LogOut,
  ChevronRight, Bell, Search, IndianRupee,
  UserPlus, Megaphone, BarChart3, Shield, UserCog,
  BookOpen, CalendarOff, ClipboardList, GraduationCap,
  Settings, Bus, Package, School,
} from 'lucide-react'
import { fetchCurrentUser, fetchMyRoles, fetchMyPermissions } from '../lib/queries/user'
import type { OrgRole } from '../lib/queries/user'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    if (context.authStatus !== 'authenticated') {
      throw redirect({ to: context.orgSlug ? '/login' : '/welcome' })
    }
    const currentUser = await context.queryClient.ensureQueryData({
      queryKey: ['currentUser'],
      queryFn: fetchCurrentUser,
      staleTime: 5 * 60 * 1000,
    })
    const myRoles = await context.queryClient.ensureQueryData({
      queryKey: ['myRoles'],
      queryFn: fetchMyRoles,
      staleTime: 5 * 60 * 1000,
    })
    const myPermissions = await context.queryClient.ensureQueryData({
      queryKey: ['myPermissions'],
      queryFn: fetchMyPermissions,
      staleTime: 5 * 60 * 1000,
    })
    return { currentUser, myRoles, myPermissions }
  },
  component: AuthenticatedLayout,
})

const allNavItems = [
  { to: '/' as const, label: 'Dashboard', icon: 'dashboard', permission: null },
  { to: '/students' as const, label: 'Students', icon: 'school', permission: 'students.manage' },
  { to: '/my-students' as const, label: 'My Students', icon: 'groups', permission: 'students.manage' },
  { to: '/attendance' as const, label: 'Attendance', icon: 'calendar_month', permission: 'attendance.view' },
  { to: '/assignments' as const, label: 'Assignments', icon: 'menu_book', permission: 'assignments.view' },
  { to: '/fees' as const, label: 'Fees & Finance', icon: 'payments', permission: 'fees.view' },
  { to: '/admissions' as const, label: 'Admissions', icon: 'person_add', permission: 'admissions.view' },
  { to: '/notices' as const, label: 'Notices', icon: 'campaign', permission: 'notices.view' },
  { to: '/leave' as const, label: 'Leave', icon: 'event_busy', permission: 'leave.view' },
  { to: '/my-payslips' as const, label: 'My Payslips', icon: 'receipt_long', permission: 'payroll.view' },
  { to: '/payroll' as const, label: 'Payroll', icon: 'account_balance_wallet', permission: 'payroll.view' },
  { to: '/reports' as const, label: 'Reports', icon: 'bar_chart', permission: 'reports.view' },
  { to: '/roles' as const, label: 'Roles', icon: 'shield', permission: 'roles.view' },
  { to: '/users' as const, label: 'Users', icon: 'manage_accounts', permission: 'users.view' },
]

const systemNavItems = [
  { to: '/settings' as const, label: 'Configuration', icon: 'settings_suggest', permission: null },
  { to: '/roles' as const, label: 'Access Control', icon: 'security', permission: 'roles.view' },
]

const topNavItems = [
  { to: '/' as const, label: 'Overview', permission: null, exact: true },
  { to: '/students' as const, label: 'Students', permission: 'students.manage' },
  { to: '/users' as const, label: 'Staff', permission: 'users.view' },
  { to: '/fees' as const, label: 'Finance', permission: 'fees.view' },
  { to: '/reports' as const, label: 'Reports', permission: 'reports.view' },
]

function AuthenticatedLayout() {
  const { orgSlug, currentUser, myRoles, myPermissions } = Route.useRouteContext()

  const perms = myPermissions as string[]
  const isSuperUser = currentUser.systemRole === 'superadmin' || currentUser.systemRole === 'tenant_admin'

  // Tenant admin on root domain: minimal sidebar (Dashboard only)
  const isTenantAdminRoot = !orgSlug && currentUser.systemRole === 'tenant_admin'

  const navItems = isTenantAdminRoot
    ? [{ to: '/' as const, label: 'Dashboard', icon: 'dashboard', permission: null }]
    : allNavItems.filter(item =>
        item.permission === null || isSuperUser || perms.includes(item.permission)
      )

  const filteredSystemItems = isTenantAdminRoot
    ? []
    : systemNavItems.filter(item =>
        item.permission === null || isSuperUser || perms.includes(item.permission)
      )

  const filteredTopNavItems = isTenantAdminRoot
    ? [{ to: '/' as const, label: 'Overview', permission: null, exact: true }]
    : topNavItems.filter(item =>
        item.permission === null || isSuperUser || perms.includes(item.permission)
      )

  const displayRole = currentUser.systemRole !== 'user'
    ? currentUser.systemRole.replace('_', ' ')
    : (myRoles as OrgRole[])[0]?.name ?? 'User'

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f7f8]">
      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3 text-slate-900">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-500 text-white">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900">
              Synapse{' '}
              <span className="text-xs font-normal text-slate-500 ml-1 border border-slate-200 rounded px-1.5 py-0.5 capitalize">
                {displayRole}
              </span>
            </h2>
          </div>

          {/* Top nav */}
          <nav className="hidden md:flex items-center gap-6 ml-4">
            {filteredTopNavItems.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={exact ? { exact: true } : undefined}
                className="text-sm font-medium leading-normal transition-colors text-slate-600 hover:text-teal-600 [&.active]:text-teal-600 [&.active]:font-semibold [&.active]:border-b-2 [&.active]:border-teal-500 [&.active]:pb-0.5"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <label className="hidden lg:flex flex-col min-w-40 h-10 w-64">
            <div className="flex w-full flex-1 items-center rounded-full bg-slate-100 px-3 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 border border-transparent">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="flex w-full min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm font-normal leading-normal ml-2"
                placeholder="Search admin portal..."
              />
            </div>
          </label>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border border-white" />
            </button>
            <Link
              to="/settings"
              className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>

          {/* User profile */}
          <Link to="/profile" className="relative group cursor-pointer flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">{currentUser.name}</p>
              <p className="text-xs text-slate-500 leading-none mt-1 capitalize">{displayRole}</p>
            </div>
            <div className="size-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
              {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
          </Link>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ──────────────────────────────────────── */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-6">
          {/* Navigation Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-1">
            <div className="px-4 py-2 mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Menu</h3>
            </div>
            {navItems.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors [&.active]:bg-teal-50 [&.active]:text-teal-700"
              >
                <span className={`material-symbols-outlined text-xl [.active_&]:icon-filled`}>{icon}</span>
                <span className="text-sm font-medium [.active_&]:font-bold">{label}</span>
              </Link>
            ))}

            {filteredSystemItems.length > 0 && (
              <>
                <div className="h-px bg-slate-100 my-2 mx-4" />
                <div className="px-4 py-2 mt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System</h3>
                </div>
                {filteredSystemItems.map(({ to, label, icon }) => (
                  <Link
                    key={`sys-${to}`}
                    to={to}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors [&.active]:bg-teal-50 [&.active]:text-teal-700"
                  >
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* Logout */}
            <div className="h-px bg-slate-100 my-2 mx-4" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>

          {/* Management Tasks Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-900 text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500 text-lg">check_circle</span>
                Management Tasks
              </h3>
              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-sm font-bold">3 Pending</span>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-amber-500 text-base">pending_actions</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Approve Leave Requests</h4>
                  <p className="text-[10px] text-slate-500 mt-1">5 staff members waiting</p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-rose-500 text-base">warning</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Resolve Fee Disputes</h4>
                  <p className="text-[10px] text-slate-500 mt-1">2 urgent cases</p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-blue-500 text-base">edit_document</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Review Term Report</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Draft saved yesterday</p>
                </div>
              </div>
            </div>
            <button className="w-full py-2 text-xs text-teal-600 font-bold hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-100">
              View All Tasks
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
