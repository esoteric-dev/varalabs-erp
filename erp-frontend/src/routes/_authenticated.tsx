import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router'
import {
  LayoutDashboard, Users, CalendarCheck, Wallet, LogOut,
  Hexagon, ChevronRight, Bell, Search, IndianRupee,
  UserPlus, Megaphone, BarChart3, Shield, UserCog,
  BookOpen, CalendarOff, ClipboardList, GraduationCap,
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
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { to: '/students' as const, label: 'Students', icon: Users, permission: 'students.manage' },
  { to: '/my-students' as const, label: 'My Students', icon: GraduationCap, permission: 'students.manage' },
  { to: '/attendance' as const, label: 'Attendance', icon: CalendarCheck, permission: 'attendance.view' },
  { to: '/assignments' as const, label: 'Assignments', icon: BookOpen, permission: 'assignments.view' },
  { to: '/fees' as const, label: 'Fees', icon: IndianRupee, permission: 'fees.view' },
  { to: '/admissions' as const, label: 'Admissions', icon: UserPlus, permission: 'admissions.view' },
  { to: '/notices' as const, label: 'Notices', icon: Megaphone, permission: 'notices.view' },
  { to: '/leave' as const, label: 'Leave', icon: CalendarOff, permission: 'leave.view' },
  { to: '/my-payslips' as const, label: 'My Payslips', icon: ClipboardList, permission: 'payroll.view' },
  { to: '/payroll' as const, label: 'Payroll', icon: Wallet, permission: 'payroll.view' },
  { to: '/reports' as const, label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  { to: '/roles' as const, label: 'Roles', icon: Shield, permission: 'roles.view' },
  { to: '/users' as const, label: 'Users', icon: UserCog, permission: 'users.view' },
]

function AuthenticatedLayout() {
  const { orgSlug, currentUser, myRoles, myPermissions } = Route.useRouteContext()

  const perms = myPermissions as string[]
  const isSuperUser = currentUser.systemRole === 'superadmin' || currentUser.systemRole === 'tenant_admin'

  // Tenant admin on root domain: minimal sidebar (Dashboard only)
  const isTenantAdminRoot = !orgSlug && currentUser.systemRole === 'tenant_admin'

  const navItems = isTenantAdminRoot
    ? [{ to: '/' as const, label: 'Dashboard', icon: LayoutDashboard, permission: null }]
    : allNavItems.filter(item =>
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 flex items-center gap-2.5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Hexagon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block">Synapse</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">School Office</span>
          </div>
        </div>

        {/* Tenant badge */}
        <div className="px-6 py-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {isTenantAdminRoot ? 'Tenant' : 'Organisation'}
          </div>
          <div className="text-sm font-medium text-teal-400">
            {isTenantAdminRoot ? currentUser.name : (orgSlug || 'Default')}
          </div>
        </div>

        {/* Nav links */}
        <div className="px-3 flex-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Navigation</div>
          <div className="flex flex-col gap-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white [&.active]:bg-gradient-to-r [&.active]:from-teal-600/20 [&.active]:to-emerald-600/10 [&.active]:text-teal-400 [&.active]:border-l-2 [&.active]:border-teal-400 transition-all"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-700 leading-none">{currentUser.name}</p>
                <p className="text-xs text-gray-400 capitalize">{displayRole}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
