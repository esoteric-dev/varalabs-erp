import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Bell, Search, Settings, Plus, X, Trash2 } from 'lucide-react'
import { fetchCurrentUser, fetchMyRoles, fetchMyPermissions } from '../lib/queries/user'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../lib/queries/dashboard'
import { fetchMyClasses, fetchMyStudents } from '../lib/queries/teacher'
import { fetchMyStudent } from '../lib/queries/students'
import { fetchAttendanceRecords } from '../lib/queries/attendance'
import type { OrgRole } from '../lib/queries/user'
import type { AdminTodo } from '../lib/queries/dashboard'

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
  { to: '/' as const, label: 'Dashboard', icon: 'dashboard', permission: null, requiresRole: null },
  { to: '/students' as const, label: 'Students', icon: 'school', permission: 'students.manage', requiresRole: null },
  { to: '/my-students' as const, label: 'My Students', icon: 'groups', permission: 'students.manage', requiresRole: 'teacher' as string | null },
  { to: '/attendance' as const, label: 'Attendance', icon: 'calendar_month', permission: 'attendance.view', requiresRole: 'teacher' as string | null },
  { to: '/assignments' as const, label: 'Assignments', icon: 'menu_book', permission: 'assignments.view', requiresRole: 'teacher' as string | null },
  { to: '/fees' as const, label: 'Fees & Finance', icon: 'payments', permission: 'fees.view', requiresRole: null },
  { to: '/admissions' as const, label: 'Admissions', icon: 'person_add', permission: 'admissions.view', requiresRole: null },
  { to: '/notices' as const, label: 'Notices', icon: 'campaign', permission: 'notices.view', requiresRole: null },
  { to: '/leave' as const, label: 'Leave', icon: 'event_busy', permission: 'leave.view', requiresRole: null },
  { to: '/my-payslips' as const, label: 'My Payslips', icon: 'receipt_long', permission: 'payroll.view', requiresRole: null },
  { to: '/payroll' as const, label: 'Payroll', icon: 'account_balance_wallet', permission: 'payroll.view', requiresRole: null },
  { to: '/reports' as const, label: 'Reports', icon: 'bar_chart', permission: 'reports.view', requiresRole: null },
  { to: '/roles' as const, label: 'Roles', icon: 'shield', permission: 'roles.view', requiresRole: null },
  { to: '/users' as const, label: 'Users', icon: 'manage_accounts', permission: 'users.view', requiresRole: null },
]

const systemNavItems = [
  { to: '/settings' as const, label: 'Configuration', icon: 'settings_suggest', permission: 'settings.update' },
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
  const { orgSlug, currentUser: initialUser, myRoles, myPermissions } = Route.useRouteContext()

  // Subscribe to currentUser query so the header re-renders when photo/profile updates
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    initialData: initialUser,
    staleTime: 5 * 60_000,
  })

  const perms = myPermissions as string[]
  const isSuperUser = currentUser.systemRole === 'superadmin' || currentUser.systemRole === 'tenant_admin'
  const roleSlugs = (myRoles as OrgRole[]).map(r => r.slug)

  // Tenant admin on root domain: minimal sidebar (Dashboard only)
  const isTenantAdminRoot = !orgSlug && currentUser.systemRole === 'tenant_admin'

  const navItems = isTenantAdminRoot
    ? [{ to: '/' as const, label: 'Dashboard', icon: 'dashboard', permission: null, requiresRole: null }]
    : allNavItems.filter(item => {
        // Permission check
        if (item.permission !== null && !isSuperUser && !perms.includes(item.permission)) return false
        // Role requirement: if set, user must have that org role (superUser doesn't override)
        if (item.requiresRole && !roleSlugs.includes(item.requiresRole)) return false
        return true
      })

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

  const isTeacher = roleSlugs.includes('teacher')
  const isStudent = roleSlugs.includes('student')

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
            {(isSuperUser || perms.includes('settings.update')) && (
              <Link
                to="/settings"
                className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* User profile */}
          <Link to="/profile" className="relative group cursor-pointer flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">{currentUser.name}</p>
              <p className="text-xs text-slate-500 leading-none mt-1 capitalize">{displayRole}</p>
            </div>
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt={currentUser.name} className="size-10 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="size-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ──────────────────────────────────────── */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-6">
          {/* Teacher Profile Card */}
          {isTeacher && <TeacherProfileCard userName={currentUser.name} displayRole={displayRole} photoUrl={currentUser.photoUrl} />}

          {/* Student Profile Card */}
          {isStudent && <StudentProfileCard userName={currentUser.name} photoUrl={currentUser.photoUrl} />}

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

          {/* My Tasks */}
          {!isTenantAdminRoot && <SidebarTodos />}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Sidebar Todo List ────────────────────────────────────────────────────────

const priorityOrder: Record<string, number> = { pending: 0, in_progress: 1, done: 2 }

function SidebarTodos() {
  const queryClient = useQueryClient()
  const [showInput, setShowInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data: todos = [] } = useQuery<AdminTodo[]>({
    queryKey: ['adminTodos'],
    queryFn: fetchTodos,
    staleTime: 60_000,
  })

  // Sort: pending first, then in_progress, then done
  const sorted = [...todos].sort(
    (a, b) => (priorityOrder[a.status] ?? 9) - (priorityOrder[b.status] ?? 9),
  )

  const pendingCount = todos.filter((t) => t.status !== 'done').length

  const addMutation = useMutation({
    mutationFn: (title: string) => createTodo(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] })
      setNewTitle('')
      setShowInput(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTodo(id, status === 'done' ? 'pending' : 'done'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTodos'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTodos'] }),
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-900 text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-500 text-lg">checklist</span>
          My Tasks
        </h3>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
              {pendingCount}
            </span>
          )}
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-slate-400 hover:text-teal-600 transition-colors"
            title="Add task"
          >
            {showInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Add task input */}
      {showInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newTitle.trim()) addMutation.mutate(newTitle.trim())
          }}
          className="flex gap-1.5"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task..."
            autoFocus
            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || addMutation.isPending}
            className="px-2.5 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Add
          </button>
        </form>
      )}

      {/* Task list */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-2xl text-slate-200 block mb-1">task_alt</span>
            <p className="text-[11px] text-slate-400">No tasks yet</p>
          </div>
        ) : (
          sorted.map((todo) => {
            const isDone = todo.status === 'done'
            return (
              <div
                key={todo.id}
                className={`flex items-start gap-2 p-2 rounded-lg group transition-colors ${
                  isDone ? 'opacity-50' : 'hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => toggleMutation.mutate({ id: todo.id, status: todo.status })}
                  className={`mt-0.5 shrink-0 size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'border-slate-300 hover:border-teal-400'
                  }`}
                >
                  {isDone && (
                    <span className="material-symbols-outlined text-xs">check</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                    {todo.title}
                  </p>
                  {todo.dueTime && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {todo.dueTime}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeMutation.mutate(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all shrink-0 mt-0.5"
                  title="Delete task"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Teacher Profile Card (sidebar) ───────────────────────────────────────────

function TeacherProfileCard({ userName, displayRole, photoUrl }: { userName: string; displayRole: string; photoUrl?: string }) {
  const { data: classes = [] } = useQuery({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
    staleTime: 5 * 60_000,
  })

  const { data: myStudents = [] } = useQuery({
    queryKey: ['myStudents'],
    queryFn: () => fetchMyStudents(),
    staleTime: 5 * 60_000,
  })

  const totalStudents = useMemo(() => {
    const unique = new Set(myStudents.map(s => s.id))
    return unique.size
  }, [myStudents])

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className="flex flex-col items-center bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="relative mb-4">
        {photoUrl ? (
          <img src={photoUrl} alt={userName} className="size-24 rounded-full object-cover border-4 border-teal-50" />
        ) : (
          <div className="size-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-teal-50">
            {initials}
          </div>
        )}
      </div>
      <h1 className="text-slate-900 text-lg font-bold mb-1">{userName}</h1>
      <p className="text-slate-500 text-sm font-medium mb-4 capitalize">{displayRole}</p>
      <div className="flex justify-between w-full mb-6 px-2">
        <div className="text-center flex-1">
          <p className="text-slate-900 text-lg font-bold">{classes.length}</p>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Classes</p>
        </div>
        <div className="w-px bg-slate-100 mx-2" />
        <div className="text-center flex-1">
          <p className="text-slate-900 text-lg font-bold">{totalStudents}</p>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Students</p>
        </div>
        <div className="w-px bg-slate-100 mx-2" />
        <div className="text-center flex-1">
          <p className="text-slate-900 text-lg font-bold">{classes.filter(c => c.isClassTeacher).length}</p>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Class TR</p>
        </div>
      </div>
      <Link
        to="/profile"
        className="w-full h-10 bg-teal-50 text-teal-600 rounded-lg text-sm font-bold hover:bg-teal-100 transition-colors flex items-center justify-center"
      >
        Edit Profile
      </Link>
    </div>
  )
}

// ── Student Profile Card (sidebar) ───────────────────────────────────────────

function StudentProfileCard({ userName, photoUrl }: { userName: string; photoUrl?: string }) {
  const { data: student } = useQuery({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
    staleTime: 5 * 60_000,
  })

  const studentId = student?.id

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendanceRecords', 'student', studentId],
    queryFn: () => fetchAttendanceRecords(undefined, studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60_000,
  })

  const totalAttendance = attendance.length
  const presentCount = attendance.filter(r => r.status === 'present').length
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className="flex flex-col items-center bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="relative mb-4">
        {(student?.photoUrl || photoUrl) ? (
          <img src={student?.photoUrl || photoUrl} alt={userName} className="size-24 rounded-full object-cover border-4 border-blue-50" />
        ) : (
          <div className="size-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-blue-50">
            {initials}
          </div>
        )}
      </div>
      <h1 className="text-slate-900 text-lg font-bold mb-1">{userName}</h1>
      <p className="text-slate-500 text-sm font-medium mb-4">{student?.className || 'Student'}</p>
      <div className="flex justify-between w-full mb-6 px-2">
        <div className="text-center flex-1">
          <p className="text-slate-900 text-lg font-bold">{attendanceRate}%</p>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Attend</p>
        </div>
        <div className="w-px bg-slate-100 mx-2" />
        <div className="text-center flex-1">
          <p className="text-slate-900 text-lg font-bold">{student?.admissionNumber || '-'}</p>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Roll No</p>
        </div>
      </div>
      <Link
        to={studentId ? `/students/${studentId}` as any : '/profile'}
        className="w-full h-10 bg-teal-50 text-teal-600 rounded-lg text-sm font-bold hover:bg-teal-100 transition-colors flex items-center justify-center"
      >
        View Full Profile
      </Link>
    </div>
  )
}
