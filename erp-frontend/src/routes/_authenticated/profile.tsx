import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import type { OrgRole } from '../../lib/queries/user'
import { fetchCurrentUser, fetchMyEmployeeId, updateMyProfile, uploadMyPhoto } from '../../lib/queries/user'
import { fetchMyStudent } from '../../lib/queries/students'
import { fetchMyClasses } from '../../lib/queries/teacher'
import type { Student } from '../../lib/queries/students'
import type { TeacherClass } from '../../lib/queries/teacher'
import { PhotoCropModal } from '../../components/ui/PhotoCropModal'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { currentUser: initialUser, myRoles, myPermissions } = Route.useRouteContext()
  const queryClient = useQueryClient()

  // Subscribe reactively so photo/profile updates re-render immediately
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    initialData: initialUser,
    staleTime: 5 * 60_000,
  })

  const roles = myRoles as OrgRole[]
  const permissions = myPermissions as string[]
  const slugs = roles.map((r) => r.slug)

  const isStudent = slugs.includes('student')
  const isTeacher = slugs.includes('teacher')
  const isAdmin = slugs.includes('admin') || currentUser.systemRole === 'tenant_admin' || currentUser.systemRole === 'superadmin'

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(currentUser.name)
  const [editPhone, setEditPhone] = useState(currentUser.phone || '')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileUpdateMutation = useMutation({
    mutationFn: ({ name, phone }: { name: string; phone: string }) =>
      updateMyProfile(name || undefined, phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setIsEditing(false)
    },
  })

  const photoUploadMutation = useMutation({
    mutationFn: (blob: Blob) => uploadMyPhoto(blob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setUploadError(null)
    },
    onError: (err: Error) => {
      setUploadError(err.message)
    },
  })

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadError(null)
      setCropFile(file)
    }
    e.target.value = ''
  }

  // Fetch student data if user has student role
  const { data: student } = useQuery<Student | null>({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
    enabled: isStudent,
  })

  // Fetch employee ID for non-student users
  const { data: employeeId } = useQuery<string | null>({
    queryKey: ['myEmployeeId'],
    queryFn: fetchMyEmployeeId,
    enabled: !isStudent,
  })

  // Fetch classes if teacher
  const { data: myClasses = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
    enabled: isTeacher,
  })

  const displayRole =
    currentUser.systemRole !== 'user'
      ? currentUser.systemRole.replace('_', ' ')
      : roles[0]?.name ?? 'User'

  const initials = currentUser.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  // Group permissions by module
  const permissionsByModule: Record<string, string[]> = {}
  for (const perm of permissions) {
    const [mod, action] = perm.split('.')
    if (!permissionsByModule[mod]) permissionsByModule[mod] = []
    permissionsByModule[mod].push(action)
  }

  const roleColorMap: Record<string, { bg: string; text: string; border: string }> = {
    admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    teacher: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    student: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
    parent: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  }

  const systemRoleBadge: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: 'bg-rose-50', text: 'text-rose-700' },
    tenant_admin: { bg: 'bg-purple-50', text: 'text-purple-700' },
    user: { bg: 'bg-slate-50', text: 'text-slate-600' },
  }

  const badge = systemRoleBadge[currentUser.systemRole] ?? systemRoleBadge.user

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-xl relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-5 rounded-full" />

        <div className="relative z-10 px-8 pt-8 pb-24">
          <div className="flex items-center gap-2 text-teal-50 text-sm mb-2">
            <Link to="/" className="hover:text-white transition-colors">Dashboard</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-white font-medium">My Profile</span>
          </div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
        </div>
      </div>

      {/* Profile Card - Overlapping the banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 -mt-20 relative z-20 mx-4">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} alt={currentUser.name} className="size-24 md:size-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="size-24 md:size-28 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-4 border-white shadow-lg">
                  {initials}
                </div>
              )}
              <div className="absolute bottom-1 right-1 size-5 rounded-full bg-green-500 border-3 border-white" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploadMutation.isPending}
                className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-white text-2xl drop-shadow">
                  {photoUploadMutation.isPending ? 'hourglass_empty' : 'photo_camera'}
                </span>
              </button>
            </div>

            {/* Name & Quick Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 truncate">
                  {currentUser.name}
                </h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${badge.bg} ${badge.text}`}>
                  {displayRole}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg text-slate-400">mail</span>
                  {currentUser.email}
                </div>
                {currentUser.phone && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-slate-400">phone</span>
                    {currentUser.phone}
                  </div>
                )}
                {/* Show employee ID for staff/teachers */}
                {employeeId && !isStudent && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-teal-500">id_card</span>
                    <span className="font-semibold text-teal-700">{employeeId}</span>
                  </div>
                )}
                {/* Show admission number for students */}
                {isStudent && student?.admissionNumber && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-teal-500">confirmation_number</span>
                    <span className="font-semibold text-teal-700">{student.admissionNumber}</span>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-xs text-rose-500 mt-1">{uploadError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              {(isTeacher || isAdmin) && !isEditing && (
                <button
                  onClick={() => {
                    setEditName(currentUser.name)
                    setEditPhone(currentUser.phone || '')
                    setIsEditing(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-600 rounded-lg text-sm font-bold hover:bg-teal-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Edit Profile
                </button>
              )}
              {(isAdmin || permissions.includes('settings.update')) && (
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Panel */}
      {isEditing && (
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 mx-4">
          <div className="px-6 py-4 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">edit</span>
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                profileUpdateMutation.mutate({ name: editName, phone: editPhone })
              }}
              className="space-y-4 max-w-lg"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={profileUpdateMutation.isPending}
                  className="px-5 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {profileUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {profileUpdateMutation.isError && (
                <p className="text-sm text-rose-500">
                  {(profileUpdateMutation.error as Error).message || 'Failed to update profile'}
                </p>
              )}
              {profileUpdateMutation.isSuccess && (
                <p className="text-sm text-emerald-600">Profile updated successfully</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Photo crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onSave={blob => { setCropFile(null); photoUploadMutation.mutate(blob) }}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="xl:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">person</span>
              <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField icon="badge" label="Full Name" value={currentUser.name} />
                <InfoField icon="mail" label="Email Address" value={currentUser.email} />
                <InfoField
                  icon="phone"
                  label="Phone Number"
                  value={currentUser.phone || 'Not provided'}
                  muted={!currentUser.phone}
                />
                <InfoField
                  icon="shield_person"
                  label="System Role"
                  value={currentUser.systemRole.replace('_', ' ')}
                  capitalize
                />
                {/* Employee ID for staff */}
                {!isStudent && employeeId && (
                  <InfoField icon="id_card" label="Employee ID" value={employeeId} highlight />
                )}
                {/* Student-specific fields */}
                {isStudent && student && (
                  <>
                    <InfoField icon="confirmation_number" label="Admission Number" value={student.admissionNumber || 'Not assigned'} muted={!student.admissionNumber} highlight={!!student.admissionNumber} />
                    <InfoField icon="class" label="Class" value={student.className || 'Not assigned'} muted={!student.className} />
                    {student.admissionDate && (
                      <InfoField icon="event" label="Admission Date" value={student.admissionDate} />
                    )}
                    {student.loginEmail && (
                      <InfoField icon="alternate_email" label="Login Email" value={student.loginEmail} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Student Details Card */}
          {isStudent && student && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">school</span>
                <h3 className="text-lg font-bold text-slate-900">Student Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {student.gender && (
                    <InfoField icon="wc" label="Gender" value={student.gender} capitalize />
                  )}
                  {student.dateOfBirth && (
                    <InfoField icon="cake" label="Date of Birth" value={student.dateOfBirth} />
                  )}
                  {student.bloodGroup && (
                    <InfoField icon="bloodtype" label="Blood Group" value={student.bloodGroup} />
                  )}
                  {student.religion && (
                    <InfoField icon="church" label="Religion" value={student.religion} capitalize />
                  )}
                  {student.email && (
                    <InfoField icon="mail" label="Personal Email" value={student.email} />
                  )}
                  {student.phone && (
                    <InfoField icon="phone" label="Personal Phone" value={student.phone} />
                  )}
                </div>
                {!student.gender && !student.dateOfBirth && !student.bloodGroup && !student.religion && (
                  <div className="text-center py-4 text-sm text-slate-400">
                    <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">info</span>
                    No additional details on record
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teacher Classes Card */}
          {isTeacher && myClasses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">class</span>
                  <h3 className="text-lg font-bold text-slate-900">Assigned Classes</h3>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">
                  {myClasses.length} {myClasses.length === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border ${
                        cls.isClassTeacher
                          ? 'bg-teal-50 border-teal-100'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className={`size-10 rounded-lg flex items-center justify-center ${
                        cls.isClassTeacher
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="material-symbols-outlined">school</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">{cls.className}</h4>
                        <p className="text-xs text-slate-400">
                          {cls.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                        </p>
                      </div>
                      {cls.isClassTeacher && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full uppercase">
                          Class Teacher
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Permissions Card */}
          {Object.keys(permissionsByModule).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500">verified_user</span>
                  <h3 className="text-lg font-bold text-slate-900">My Permissions</h3>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                  {permissions.length} permissions
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(permissionsByModule).map(([module, actions]) => (
                    <div key={module} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-base text-teal-500">
                          {getModuleIcon(module)}
                        </span>
                        <h4 className="text-sm font-bold text-slate-700 capitalize">{module}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((action) => (
                          <span
                            key={action}
                            className="px-2 py-0.5 bg-white text-slate-600 text-xs font-medium rounded border border-slate-200 capitalize"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* ID Card */}
          {(employeeId || (isStudent && student?.admissionNumber)) && (
            <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-md text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">id_card</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">
                    {isStudent ? 'Student ID' : 'Employee ID'}
                  </h3>
                </div>
                <p className="text-2xl font-bold tracking-wide mb-3">
                  {isStudent ? student?.admissionNumber : employeeId}
                </p>
                <p className="text-sm opacity-80 font-medium">{currentUser.name}</p>
                <p className="text-xs opacity-60 mt-1 capitalize">{displayRole}</p>
              </div>
            </div>
          )}

          {/* Roles Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">groups</span>
              <h3 className="text-lg font-bold text-slate-900">Assigned Roles</h3>
            </div>
            <div className="p-6">
              {roles.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">shield</span>
                  No organization roles assigned
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => {
                    const colors = roleColorMap[role.slug] ?? {
                      bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100',
                    }
                    return (
                      <div
                        key={role.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                      >
                        <div className={`size-10 rounded-lg flex items-center justify-center ${colors.text} bg-white border ${colors.border}`}>
                          <span className="material-symbols-outlined text-xl">{getRoleIcon(role.slug)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold ${colors.text} truncate`}>{role.name}</h4>
                          <p className="text-xs text-slate-400">
                            {role.isSystem ? 'System role' : 'Custom role'}
                          </p>
                        </div>
                        {role.isSystem && (
                          <span className="material-symbols-outlined text-base text-slate-300">lock</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Account Security Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500">security</span>
              <h3 className="text-lg font-bold text-slate-900">Account Security</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Email Verified</p>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="material-symbols-outlined text-slate-400">key</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Password</p>
                  <p className="text-xs text-slate-400">Managed through login credentials</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="material-symbols-outlined text-slate-400">token</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Active Session</p>
                  <p className="text-xs text-slate-400">Currently logged in</p>
                </div>
                <span className="size-2 bg-green-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">link</span>
              <h3 className="text-lg font-bold text-slate-900">Quick Links</h3>
            </div>
            <div className="p-4 space-y-1">
              <QuickLink to="/" icon="dashboard" label="Dashboard" />
              {(isAdmin || permissions.includes('settings.update')) && (
                <QuickLink to="/settings" icon="settings" label="Settings" />
              )}
              {isStudent && (
                <>
                  <QuickLink to="/attendance" icon="calendar_month" label="My Attendance" />
                  <QuickLink to="/assignments" icon="menu_book" label="Assignments" />
                </>
              )}
              {isTeacher && (
                <>
                  <QuickLink to="/my-students" icon="groups" label="My Students" />
                  <QuickLink to="/attendance" icon="calendar_month" label="Attendance" />
                </>
              )}
              {isAdmin && (
                <>
                  <QuickLink to="/users" icon="manage_accounts" label="Manage Users" />
                  <QuickLink to="/reports" icon="bar_chart" label="Reports" />
                </>
              )}
              <QuickLink to="/notices" icon="campaign" label="Notices" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ──────────────────────────────────────────────────────────

function InfoField({
  icon,
  label,
  value,
  muted = false,
  capitalize = false,
  mono = false,
  highlight = false,
}: {
  icon: string
  label: string
  value: string
  muted?: boolean
  capitalize?: boolean
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 border ${
        highlight ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'
      }`}>
        <span className={`material-symbols-outlined text-lg ${highlight ? 'text-teal-500' : 'text-slate-400'}`}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm font-semibold truncate ${
            muted ? 'text-slate-400 italic' : highlight ? 'text-teal-700' : 'text-slate-900'
          } ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-xs' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: string
  label: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      <span className="material-symbols-outlined text-base text-slate-300 ml-auto">
        chevron_right
      </span>
    </Link>
  )
}

// ── Icon Helpers ───────────────────────────────────────────────────────────────

function getModuleIcon(module: string): string {
  const map: Record<string, string> = {
    students: 'school',
    fees: 'payments',
    admissions: 'person_add',
    attendance: 'calendar_month',
    payroll: 'account_balance_wallet',
    roles: 'shield',
    users: 'manage_accounts',
    notices: 'campaign',
    reports: 'bar_chart',
    dashboard: 'dashboard',
    assignments: 'menu_book',
    leave: 'event_busy',
    settings: 'settings',
  }
  return map[module] ?? 'key'
}

function getRoleIcon(slug: string): string {
  const map: Record<string, string> = {
    admin: 'admin_panel_settings',
    teacher: 'school',
    student: 'person',
    parent: 'family_restroom',
  }
  return map[slug] ?? 'badge'
}
