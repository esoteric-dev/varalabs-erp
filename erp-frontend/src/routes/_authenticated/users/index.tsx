import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, useRef, useCallback } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Copy, Check, KeyRound, Search, UserPlus, Eye } from 'lucide-react'
import { fetchOrgUsers, createUser, previewLoginEmail } from '../../../lib/queries/org-users'
import { fetchRoles, assignRoleToUser, removeRoleFromUser } from '../../../lib/queries/roles'
import { fetchTeacherClassAssignments, assignClassToTeacher, removeClassFromTeacher } from '../../../lib/queries/teacher'
import { resetUserPassword } from '../../../lib/queries/user'
import { resolveOrg } from '../../../lib/queries/user'
import { uploadUserPhoto } from '../../../lib/queries/uploads'
import type { OrgUser, CreateUserResult } from '../../../lib/queries/org-users'
import type { RoleWithPermissions } from '../../../lib/queries/roles'
import type { TeacherClass } from '../../../lib/queries/teacher'

export const Route = createFileRoute('/_authenticated/users/')({
  component: UsersPage,
})

const roleColors: Record<string, string> = {
  superadmin: 'bg-red-50 text-red-700',
  tenant_admin: 'bg-purple-50 text-purple-700',
  user: 'bg-gray-50 text-gray-600',
}

function UsersPage() {
  const queryClient = useQueryClient()
  const { orgSlug } = Route.useRouteContext()
  const { data: orgInfo } = useQuery({
    queryKey: ['resolveOrg', orgSlug],
    queryFn: () => resolveOrg(orgSlug),
    enabled: !!orgSlug,
    staleTime: 10 * 60_000,
  })
  const orgId = orgInfo?.orgId ?? null
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [newClassName, setNewClassName] = useState('')
  const [newIsClassTeacher, setNewIsClassTeacher] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [systemRoleFilter, setSystemRoleFilter] = useState<string>('all')

  const { data: allUsers = [], isLoading } = useQuery<OrgUser[]>({
    queryKey: ['orgUsers'],
    queryFn: fetchOrgUsers,
  })

  // Exclude students — they are managed from the Students section
  const users = useMemo(
    () => allUsers.filter((u) => !u.roleNames?.split(', ').includes('Student')),
    [allUsers],
  )

  const { data: roles = [] } = useQuery<RoleWithPermissions[]>({
    queryKey: ['roles', orgId],
    queryFn: () => fetchRoles(orgId!),
    enabled: !!orgId,
  })

  const { data: classAssignments = [] } = useQuery<TeacherClass[]>({
    queryKey: ['teacherClassAssignments', expandedUser],
    queryFn: () => fetchTeacherClassAssignments(expandedUser!),
    enabled: !!expandedUser,
  })

  // Derive unique role names across staff users for the filter (exclude Student)
  const availableOrgRoles = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) {
      if (u.roleNames) {
        for (const r of u.roleNames.split(', ')) {
          if (r !== 'Student') set.add(r)
        }
      }
    }
    return Array.from(set).sort()
  }, [users])

  const availableSystemRoles = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) set.add(u.systemRole)
    return Array.from(set).sort()
  }, [users])

  // Apply filters
  const filteredUsers = useMemo(() => {
    let result = users

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.employeeId && u.employeeId.toLowerCase().includes(q)),
      )
    }

    if (roleFilter !== 'all') {
      if (roleFilter === 'none') {
        result = result.filter((u) => !u.roleNames)
      } else {
        result = result.filter((u) => u.roleNames?.split(', ').includes(roleFilter))
      }
    }

    if (systemRoleFilter !== 'all') {
      result = result.filter((u) => u.systemRole === systemRoleFilter)
    }

    return result
  }, [users, searchQuery, roleFilter, systemRoleFilter])

  // Stats (excluding students)
  const stats = useMemo(() => {
    const total = users.length
    const byRole: Record<string, number> = {}
    for (const u of users) {
      if (u.roleNames) {
        for (const r of u.roleNames.split(', ')) {
          if (r !== 'Student') byRole[r] = (byRole[r] || 0) + 1
        }
      }
    }
    const noRole = users.filter((u) => !u.roleNames).length
    return { total, byRole, noRole }
  }, [users])

  const createUserMutation = useMutation({
    mutationFn: ({ name, email, phone, password }: { name: string; email?: string; phone?: string; password?: string }) =>
      createUser(name, email, phone, undefined, password || undefined),
    onSuccess: (data: CreateUserResult) => {
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
      if (data.generatedPassword) {
        setCreatedCredentials({ email: data.user.email, password: data.generatedPassword })
      }
      setShowForm(false)
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setNewPassword('')
      setEmailWasAutoSet(true)
    },
  })

  const [emailWasAutoSet, setEmailWasAutoSet] = useState(true)
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = useCallback((value: string) => {
    setNewName(value)

    // Only auto-fill if user hasn't manually edited the email
    if (!emailWasAutoSet) return

    // Immediate local preview
    if (orgSlug) {
      setNewEmail(suggestEmail(value, orgSlug))
    }

    // Debounced backend preview for uniqueness
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
    const trimmed = value.trim()
    if (!trimmed) {
      setNewEmail('')
      return
    }
    emailDebounceRef.current = setTimeout(async () => {
      try {
        const email = await previewLoginEmail(trimmed)
        setNewEmail(email)
      } catch {
        // Keep local preview on error
      }
    }, 400)
  }, [orgSlug, emailWasAutoSet])

  const handleEmailChange = (value: string) => {
    setNewEmail(value)
    setEmailWasAutoSet(false)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRoleToUser(userId, orgId!, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRoleFromUser(userId, orgId!, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
    },
  })

  const assignClassMutation = useMutation({
    mutationFn: ({ userId, className, isClassTeacher }: { userId: string; className: string; isClassTeacher: boolean }) =>
      assignClassToTeacher(userId, className, isClassTeacher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClassAssignments', expandedUser] })
      setNewClassName('')
      setNewIsClassTeacher(false)
    },
  })

  const removeClassMutation = useMutation({
    mutationFn: (assignmentId: string) => removeClassFromTeacher(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClassAssignments', expandedUser] })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
    onSuccess: (data, userId) => {
      if (data.generatedPassword) {
        const user = users.find(u => u.id === userId)
        setResetCredentials({ email: user?.email || '', password: data.generatedPassword })
      }
    },
  })

  const isTeacher = (user: OrgUser) =>
    user.roleNames?.toLowerCase().includes('teacher') ?? false

  const hasActiveFilters = searchQuery || roleFilter !== 'all' || systemRoleFilter !== 'all'

  const clearAllFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
    setSystemRoleFilter('all')
  }

  const roleCardColor: Record<string, { num: string; active: string; icon: string }> = {
    Admin: { num: 'text-purple-600', active: 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/40', icon: 'admin_panel_settings' },
    Teacher: { num: 'text-blue-600', active: 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/40', icon: 'school' },
    Parent: { num: 'text-amber-600', active: 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/40', icon: 'family_restroom' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff & Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage organisation staff, teachers, and their roles</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/add-staff"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Onboard Staff
          </Link>
          <button
            onClick={() => {
              setShowForm(true)
              setCreatedCredentials(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Generated Credentials Card */}
      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-800 mb-1">User Created — Generated Credentials</h3>
              <p className="text-xs text-emerald-600 mb-3">Save these credentials. The password will not be shown again.</p>
            </div>
            <button onClick={() => setCreatedCredentials(null)} className="text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800 truncate">{createdCredentials.email}</span>
                <button onClick={() => copyToClipboard(createdCredentials.email, 'cred-email')} className="text-gray-400 hover:text-teal-600 transition-colors">
                  {copiedField === 'cred-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Password</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800">{createdCredentials.password}</span>
                <button onClick={() => copyToClipboard(createdCredentials.password, 'cred-pw')} className="text-gray-400 hover:text-teal-600 transition-colors">
                  {copiedField === 'cred-pw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Credentials Card */}
      {resetCredentials && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Password Reset — New Credentials</h3>
              <p className="text-xs text-amber-600 mb-3">Save these credentials. The password will not be shown again.</p>
            </div>
            <button onClick={() => setResetCredentials(null)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-amber-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800 truncate">{resetCredentials.email}</span>
                <button onClick={() => copyToClipboard(resetCredentials.email, 'reset-email')} className="text-gray-400 hover:text-teal-600 transition-colors">
                  {copiedField === 'reset-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Password</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800">{resetCredentials.password}</span>
                <button onClick={() => copyToClipboard(resetCredentials.password, 'reset-pw')} className="text-gray-400 hover:text-teal-600 transition-colors">
                  {copiedField === 'reset-pw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Add New User</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createUserMutation.mutate({
                name: newName,
                email: newEmail || undefined,
                phone: newPhone || undefined,
                password: newPassword || undefined,
              })
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input value={newName} onChange={(e) => handleNameChange(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Login Email <span className="text-gray-400 font-normal">(auto-generated from name)</span>
                </label>
                <input value={newEmail} onChange={(e) => handleEmailChange(e.target.value)} type="email" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder={orgSlug ? `name@${orgSlug}.com` : 'Auto-generated if blank'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Password <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span>
                </label>
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Auto-generated if empty" />
              </div>
            </div>
            <button type="submit" disabled={createUserMutation.isPending} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
              {createUserMutation.isPending ? 'Adding...' : 'Add User'}
            </button>
          </form>
          {createUserMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(createUserMutation.error as Error).message || 'Failed to create user'}
            </p>
          )}
        </div>
      )}

      {/* Main layout: table on left, role cards tower on right */}
      <div className="flex gap-5 items-start">
        {/* Left: Search + Table */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                  placeholder="Search by name, email, or ID..."
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Role:</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Roles</option>
                    {availableOrgRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="none">No Role</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">System:</label>
                  <select
                    value={systemRoleFilter}
                    onChange={(e) => setSystemRoleFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All</option>
                    {availableSystemRoles.map((r) => (
                      <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Showing {filteredUsers.length} of {users.length} staff
                </span>
                <div className="flex flex-wrap gap-1.5 ml-2">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                      Search: &ldquo;{searchQuery}&rdquo;
                      <button onClick={() => setSearchQuery('')} className="hover:text-teal-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {roleFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      Role: {roleFilter === 'none' ? 'No Role' : roleFilter}
                      <button onClick={() => setRoleFilter('all')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {systemRoleFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full capitalize">
                      System: {systemRoleFilter.replace('_', ' ')}
                      <button onClick={() => setSystemRoleFilter('all')} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {hasActiveFilters ? 'No staff match the current filters' : 'No staff found'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="mt-2 text-sm text-teal-600 font-medium hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Employee ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Org Roles</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      roles={roles}
                      orgId={orgId}
                      expandedUser={expandedUser}
                      classAssignments={classAssignments}
                      newClassName={newClassName}
                      newIsClassTeacher={newIsClassTeacher}
                      copiedField={copiedField}
                      setExpandedUser={setExpandedUser}
                      setNewClassName={setNewClassName}
                      setNewIsClassTeacher={setNewIsClassTeacher}
                      assignMutation={assignMutation}
                      removeMutation={removeMutation}
                      assignClassMutation={assignClassMutation}
                      removeClassMutation={removeClassMutation}
                      resetPasswordMutation={resetPasswordMutation}
                      isTeacher={isTeacher(user)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Role summary tower */}
        {!isLoading && users.length > 0 && (
          <div className="hidden xl:flex flex-col w-48 shrink-0 gap-2.5">
            {/* All Staff */}
            <button
              onClick={() => { setRoleFilter('all'); setSystemRoleFilter('all') }}
              className={`bg-white rounded-xl border p-4 text-left transition-colors ${
                roleFilter === 'all' && systemRoleFilter === 'all'
                  ? 'border-teal-300 ring-1 ring-teal-200 bg-teal-50/40'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-lg flex items-center justify-center ${
                  roleFilter === 'all' && systemRoleFilter === 'all' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className="material-symbols-outlined text-xl">groups</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-[11px] font-medium text-gray-500">All Staff</p>
                </div>
              </div>
            </button>

            {/* Per-role cards */}
            {Object.entries(stats.byRole).map(([role, count]) => {
              const isActive = roleFilter === role
              const colors = roleCardColor[role] ?? { num: 'text-gray-600', active: 'border-gray-300 ring-1 ring-gray-200 bg-gray-50/40', icon: 'badge' }
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(isActive ? 'all' : role)}
                  className={`bg-white rounded-xl border p-4 text-left transition-colors ${
                    isActive ? colors.active : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-9 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-white border border-current ' + colors.num : 'bg-gray-100 text-gray-400'
                    }`}>
                      <span className="material-symbols-outlined text-xl">{colors.icon}</span>
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${isActive ? colors.num : 'text-gray-900'}`}>{count}</p>
                      <p className={`text-[11px] font-medium ${isActive ? colors.num : 'text-gray-500'}`}>{role}s</p>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* No Role */}
            {stats.noRole > 0 && (
              <button
                onClick={() => setRoleFilter(roleFilter === 'none' ? 'all' : 'none')}
                className={`bg-white rounded-xl border p-4 text-left transition-colors ${
                  roleFilter === 'none'
                    ? 'border-gray-300 ring-1 ring-gray-200 bg-gray-50/40'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-lg flex items-center justify-center ${
                    roleFilter === 'none' ? 'bg-white border border-gray-400 text-gray-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="material-symbols-outlined text-xl">help_outline</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-400">{stats.noRole}</p>
                    <p className="text-[11px] font-medium text-gray-400">Unassigned</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({
  user,
  roles,
  orgId,
  expandedUser,
  classAssignments,
  newClassName,
  newIsClassTeacher,
  setExpandedUser,
  setNewClassName,
  setNewIsClassTeacher,
  assignMutation,
  removeMutation,
  assignClassMutation,
  removeClassMutation,
  resetPasswordMutation,
  isTeacher,
}: {
  user: OrgUser
  roles: RoleWithPermissions[]
  orgId: string | null
  expandedUser: string | null
  classAssignments: TeacherClass[]
  newClassName: string
  newIsClassTeacher: boolean
  copiedField: string | null
  setExpandedUser: (id: string | null) => void
  setNewClassName: (v: string) => void
  setNewIsClassTeacher: (v: boolean) => void
  assignMutation: ReturnType<typeof useMutation<boolean, Error, { userId: string; roleId: string }>>
  removeMutation: ReturnType<typeof useMutation<boolean, Error, { userId: string; roleId: string }>>
  assignClassMutation: ReturnType<typeof useMutation<boolean, Error, { userId: string; className: string; isClassTeacher: boolean }>>
  removeClassMutation: ReturnType<typeof useMutation<boolean, Error, string>>
  resetPasswordMutation: ReturnType<typeof useMutation<{ success: boolean; generatedPassword?: string }, Error, string>>
  isTeacher: boolean
}) {
  const isExpanded = expandedUser === user.id
  const queryClient = useQueryClient()
  const avatarFileRef = useRef<HTMLInputElement>(null)

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadUserPhoto(user.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
      queryClient.invalidateQueries({ queryKey: ['orgUser', user.id] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
  })

  const handleAvatarPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      photoMutation.mutate(file)
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            {isTeacher && (
              <button
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <div className="relative shrink-0 group">
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPhoto} />
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
              <button
                onClick={() => avatarFileRef.current?.click()}
                disabled={photoMutation.isPending}
                className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-white text-sm drop-shadow">
                  {photoMutation.isPending ? 'hourglass_empty' : 'photo_camera'}
                </span>
              </button>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-800 block truncate">{user.name}</span>
              <span className={`inline-flex px-1.5 py-0 text-[10px] font-medium rounded capitalize ${roleColors[user.systemRole] || 'bg-gray-50 text-gray-600'}`}>
                {user.systemRole.replace('_', ' ')}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-600 block truncate max-w-[200px]">{user.email}</span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          {user.employeeId ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-100 text-slate-600 whitespace-nowrap">
              {user.employeeId}
            </span>
          ) : (
            <span className="text-xs text-gray-300">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {user.roleNames ? (
            <div className="flex flex-wrap gap-1">
              {user.roleNames.split(', ').map((roleName) => {
                const matchedRole = roles.find(r => r.name === roleName)
                return (
                  <span
                    key={roleName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700"
                  >
                    {roleName}
                    {matchedRole && orgId && (
                      <button
                        onClick={() => removeMutation.mutate({ userId: user.id, roleId: matchedRole.id })}
                        className="hover:text-red-600 transition-colors"
                        title="Remove role"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className="text-xs text-gray-400">None</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell whitespace-nowrap">{user.phone || '-'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {orgId && roles.length > 0 && (
              <select
                className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[110px]"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    assignMutation.mutate({ userId: user.id, roleId: e.target.value })
                    e.target.value = ''
                  }
                }}
              >
                <option value="" disabled>+ Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => resetPasswordMutation.mutate(user.id)}
              disabled={resetPasswordMutation.isPending}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Reset password"
            >
              <KeyRound className="w-3 h-3" />
              Reset
            </button>
            <Link
              to="/users/$userId"
              params={{ userId: user.id }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors whitespace-nowrap"
            >
              <Eye className="w-3 h-3" />
              View
            </Link>
          </div>
        </td>
      </tr>
      {isExpanded && isTeacher && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50">
            <div className="ml-7">
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Class Assignments</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {classAssignments.map(ca => (
                  <span key={ca.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-gray-200">
                    {ca.className}
                    {ca.isClassTeacher && <span className="text-[9px] text-teal-600 font-semibold">CT</span>}
                    <button onClick={() => removeClassMutation.mutate(ca.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Remove class">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {classAssignments.length === 0 && <span className="text-xs text-gray-400">No classes assigned</span>}
              </div>
              <div className="flex items-center gap-2">
                <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Class name (e.g. 10-A)" className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 w-40" />
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={newIsClassTeacher} onChange={e => setNewIsClassTeacher(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  Class Teacher
                </label>
                <button
                  onClick={() => { if (newClassName) { assignClassMutation.mutate({ userId: user.id, className: newClassName, isClassTeacher: newIsClassTeacher }) } }}
                  disabled={!newClassName || assignClassMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function suggestEmail(name: string, orgSlug: string): string {
  if (!name.trim()) return ''
  const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.')
  return slug ? `${slug}@${orgSlug}.com` : ''
}
