import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { fetchOrgUser, fetchStaffDetail, updateUser, updateStaffDetails } from '../../../lib/queries/org-users'
import { uploadUserPhoto } from '../../../lib/queries/uploads'
import { generateDocument } from '../../../lib/queries/documents'
import { PhotoCropModal } from '../../../components/ui/PhotoCropModal'
import type { OrgUser, StaffDetail } from '../../../lib/queries/org-users'

export const Route = createFileRoute('/_authenticated/users/$userId')({
  component: UserDetailPage,
})

const roleColors: Record<string, string> = {
  superadmin: 'bg-red-50 text-red-700',
  tenant_admin: 'bg-purple-50 text-purple-700',
  user: 'bg-gray-50 text-gray-600',
}

function UserDetailPage() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()

  // ── State ───────────────────────────────────────────────────────────
  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [isEditingStaff, setIsEditingStaff] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Basic info form
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Staff details form
  const [staffForm, setStaffForm] = useState<Partial<Omit<StaffDetail, 'userId'>>>({})

  // ── Queries ─────────────────────────────────────────────────────────
  const { data: user, isLoading: loadingUser } = useQuery<OrgUser | null>({
    queryKey: ['orgUser', userId],
    queryFn: () => fetchOrgUser(userId),
  })

  const { data: staffDetail } = useQuery<StaffDetail | null>({
    queryKey: ['staffDetail', userId],
    queryFn: () => fetchStaffDetail(userId),
  })

  // ── Mutations ───────────────────────────────────────────────────────
  const photoUploadMutation = useMutation({
    mutationFn: (blob: Blob) => uploadUserPhoto(userId, blob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUser', userId] })
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setUploadError(null)
    },
    onError: (err: Error) => setUploadError(err.message),
  })

  const updateUserMutation = useMutation({
    mutationFn: (fields: { name?: string; email?: string; phone?: string }) =>
      updateUser(userId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUser', userId] })
      queryClient.invalidateQueries({ queryKey: ['orgUsers'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setIsEditingBasic(false)
    },
  })

  const updateStaffMutation = useMutation({
    mutationFn: (details: Partial<Omit<StaffDetail, 'userId'>>) =>
      updateStaffDetails(userId, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffDetail', userId] })
      setIsEditingStaff(false)
    },
  })

  // ── Handlers ────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }
    setUploadError(null)
    setCropFile(file)
    e.target.value = ''
  }

  const startEditBasic = () => {
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    setEditPhone(user?.phone || '')
    setIsEditingBasic(true)
  }

  const saveBasic = () => {
    updateUserMutation.mutate({
      name: editName || undefined,
      email: editEmail || undefined,
      phone: editPhone,
    })
  }

  const startEditStaff = () => {
    setStaffForm({
      designation: staffDetail?.designation || '',
      department: staffDetail?.department || '',
      qualification: staffDetail?.qualification || '',
      dateOfBirth: staffDetail?.dateOfBirth || '',
      gender: staffDetail?.gender || '',
      bloodGroup: staffDetail?.bloodGroup || '',
      maritalStatus: staffDetail?.maritalStatus || '',
      address: staffDetail?.address || '',
      city: staffDetail?.city || '',
      state: staffDetail?.state || '',
      zipCode: staffDetail?.zipCode || '',
      country: staffDetail?.country || 'India',
      bankAccountName: staffDetail?.bankAccountName || '',
      bankAccountNumber: staffDetail?.bankAccountNumber || '',
      bankName: staffDetail?.bankName || '',
      bankIfsc: staffDetail?.bankIfsc || '',
      bankBranch: staffDetail?.bankBranch || '',
      dateOfJoining: staffDetail?.dateOfJoining || '',
      personalEmail: staffDetail?.personalEmail || '',
    })
    setIsEditingStaff(true)
  }

  const saveStaff = () => {
    // Clean empty strings to null (undefined) to avoid clearing existing values on the backend
    const cleaned: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(staffForm)) {
      cleaned[key] = value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
    }
    updateStaffMutation.mutate(cleaned)
  }

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?'

  // ── Loading State ───────────────────────────────────────────────────
  if (loadingUser) {
    return (
      <div className="space-y-6">
        <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-xl relative overflow-hidden shadow-md">
          <div className="relative z-10 px-8 pt-8 pb-24">
            <div className="flex items-center gap-2 text-teal-50 text-sm mb-2">
              <Link to="/users" className="hover:text-white transition-colors">Staff & Users</Link>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-white font-medium">Loading...</span>
            </div>
          </div>
        </div>
        <div className="py-8 text-center text-sm text-slate-400">Loading user profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-xl relative overflow-hidden shadow-md">
          <div className="relative z-10 px-8 pt-8 pb-24">
            <div className="flex items-center gap-2 text-teal-50 text-sm mb-2">
              <Link to="/users" className="hover:text-white transition-colors">Staff & Users</Link>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-white font-medium">Not Found</span>
            </div>
            <h1 className="text-2xl font-bold text-white">User Not Found</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 -mt-20 relative z-20 mx-4 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">person_off</span>
          <p className="text-sm text-slate-400">This user record could not be found.</p>
          <Link to="/users" className="inline-flex items-center gap-1.5 mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Staff & Users
          </Link>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-xl relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2" />
        <div className="relative z-10 px-8 pt-8 pb-24">
          <div className="flex items-center gap-2 text-teal-50 text-sm mb-2">
            <Link to="/users" className="hover:text-white transition-colors">Staff & Users</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-white font-medium">{user.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">User Profile</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 -mt-20 relative z-20 mx-4">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar with upload */}
            <div className="relative shrink-0 group">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="size-24 md:size-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="size-24 md:size-28 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-4 border-white shadow-lg">
                  {initials}
                </div>
              )}
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
                <h2 className="text-2xl font-bold text-slate-900 truncate">{user.name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${roleColors[user.systemRole] || 'bg-gray-50 text-gray-600'}`}>
                  {user.systemRole.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-3">
                {user.employeeId && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-teal-500">badge</span>
                    <span className="font-semibold text-teal-700">{user.employeeId}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg text-slate-400">mail</span>
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-slate-400">phone</span>
                    {user.phone}
                  </div>
                )}
              </div>
              {user.roleNames && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {user.roleNames.split(', ').map((role) => (
                    <span key={role} className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700">
                      {role}
                    </span>
                  ))}
                </div>
              )}
              {uploadError && <p className="text-xs text-rose-500 mt-2">{uploadError}</p>}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => setShowOfferModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Generate Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 mx-4">
        {/* Left Column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Basic Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Basic Information</h3>
              {!isEditingBasic && (
                <button onClick={startEditBasic} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                  Edit
                </button>
              )}
            </div>

            {isEditingBasic ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveBasic} disabled={updateUserMutation.isPending} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setIsEditingBasic(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
                {updateUserMutation.isError && (
                  <p className="text-xs text-rose-500">{(updateUserMutation.error as Error).message}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Full Name" value={user.name} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label="System Role" value={user.systemRole.replace('_', ' ')} />
                <InfoRow label="Employee ID" value={user.employeeId} />
                <InfoRow label="Org Roles" value={user.roleNames} />
              </div>
            )}
          </div>

          {/* Staff Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Staff Details</h3>
              {!isEditingStaff && (
                <button onClick={startEditStaff} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                  {staffDetail ? 'Edit' : 'Add'}
                </button>
              )}
            </div>

            {isEditingStaff ? (
              <div className="space-y-4">
                {/* Personal */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Personal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <StaffInput label="Designation" value={staffForm.designation} onChange={(v) => setStaffForm({ ...staffForm, designation: v })} />
                    <StaffInput label="Department" value={staffForm.department} onChange={(v) => setStaffForm({ ...staffForm, department: v })} />
                    <StaffInput label="Qualification" value={staffForm.qualification} onChange={(v) => setStaffForm({ ...staffForm, qualification: v })} />
                    <StaffInput label="Date of Birth" value={staffForm.dateOfBirth} onChange={(v) => setStaffForm({ ...staffForm, dateOfBirth: v })} type="date" />
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                      <select value={staffForm.gender || ''} onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <StaffInput label="Blood Group" value={staffForm.bloodGroup} onChange={(v) => setStaffForm({ ...staffForm, bloodGroup: v })} />
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Marital Status</label>
                      <select value={staffForm.maritalStatus || ''} onChange={(e) => setStaffForm({ ...staffForm, maritalStatus: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white">
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <StaffInput label="Date of Joining" value={staffForm.dateOfJoining} onChange={(v) => setStaffForm({ ...staffForm, dateOfJoining: v })} type="date" />
                    <StaffInput label="Personal Email" value={staffForm.personalEmail} onChange={(v) => setStaffForm({ ...staffForm, personalEmail: v })} type="email" />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <StaffInput label="Street Address" value={staffForm.address} onChange={(v) => setStaffForm({ ...staffForm, address: v })} />
                    </div>
                    <StaffInput label="City" value={staffForm.city} onChange={(v) => setStaffForm({ ...staffForm, city: v })} />
                    <StaffInput label="State" value={staffForm.state} onChange={(v) => setStaffForm({ ...staffForm, state: v })} />
                    <StaffInput label="ZIP Code" value={staffForm.zipCode} onChange={(v) => setStaffForm({ ...staffForm, zipCode: v })} />
                    <StaffInput label="Country" value={staffForm.country} onChange={(v) => setStaffForm({ ...staffForm, country: v })} />
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Bank Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <StaffInput label="Account Holder" value={staffForm.bankAccountName} onChange={(v) => setStaffForm({ ...staffForm, bankAccountName: v })} />
                    <StaffInput label="Account Number" value={staffForm.bankAccountNumber} onChange={(v) => setStaffForm({ ...staffForm, bankAccountNumber: v })} />
                    <StaffInput label="Bank Name" value={staffForm.bankName} onChange={(v) => setStaffForm({ ...staffForm, bankName: v })} />
                    <StaffInput label="IFSC Code" value={staffForm.bankIfsc} onChange={(v) => setStaffForm({ ...staffForm, bankIfsc: v })} />
                    <StaffInput label="Branch" value={staffForm.bankBranch} onChange={(v) => setStaffForm({ ...staffForm, bankBranch: v })} />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={saveStaff} disabled={updateStaffMutation.isPending} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {updateStaffMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setIsEditingStaff(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
                {updateStaffMutation.isError && (
                  <p className="text-xs text-rose-500">{(updateStaffMutation.error as Error).message}</p>
                )}
              </div>
            ) : staffDetail ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Personal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoRow label="Designation" value={staffDetail.designation} />
                    <InfoRow label="Department" value={staffDetail.department} />
                    <InfoRow label="Qualification" value={staffDetail.qualification} />
                    <InfoRow label="Date of Birth" value={staffDetail.dateOfBirth} />
                    <InfoRow label="Gender" value={staffDetail.gender} />
                    <InfoRow label="Blood Group" value={staffDetail.bloodGroup} />
                    <InfoRow label="Marital Status" value={staffDetail.maritalStatus} />
                    <InfoRow label="Date of Joining" value={staffDetail.dateOfJoining} />
                    <InfoRow label="Personal Email" value={staffDetail.personalEmail} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoRow label="Address" value={staffDetail.address} />
                    <InfoRow label="City" value={staffDetail.city} />
                    <InfoRow label="State" value={staffDetail.state} />
                    <InfoRow label="ZIP Code" value={staffDetail.zipCode} />
                    <InfoRow label="Country" value={staffDetail.country} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Bank Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoRow label="Account Holder" value={staffDetail.bankAccountName} />
                    <InfoRow label="Account Number" value={staffDetail.bankAccountNumber} />
                    <InfoRow label="Bank Name" value={staffDetail.bankName} />
                    <InfoRow label="IFSC Code" value={staffDetail.bankIfsc} />
                    <InfoRow label="Branch" value={staffDetail.bankBranch} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">person_add</span>
                <p className="text-sm text-slate-400">No staff details on file.</p>
                <button onClick={startEditStaff} className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700">
                  Add staff details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-5">
          {/* Employee ID Card */}
          {user.employeeId && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-teal-400">badge</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee ID</span>
              </div>
              <div className="text-center py-3">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="size-16 rounded-full object-cover mx-auto mb-3 border-2 border-teal-400 shadow" />
                ) : (
                  <div className="size-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 border-2 border-teal-400 shadow">
                    {initials}
                  </div>
                )}
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-teal-400 text-sm font-mono mt-1">{user.employeeId}</p>
                {staffDetail?.designation && (
                  <p className="text-slate-400 text-xs mt-1">{staffDetail.designation}</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowOfferModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-lg">description</span>
                Generate Offer Letter
              </button>
              <Link
                to="/users"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Staff & Users
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Letter Modal */}
      {showOfferModal && (
        <OfferLetterModal
          userId={userId}
          userName={user.name}
          onClose={() => setShowOfferModal(false)}
        />
      )}

      {/* Photo crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onSave={blob => { setCropFile(null); photoUploadMutation.mutate(blob) }}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5 capitalize">
        {value ? value.replace('_', ' ') : <span className="text-slate-300">-</span>}
      </dd>
    </div>
  )
}

function StaffInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | null | undefined
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />
    </div>
  )
}

function OfferLetterModal({
  userId,
  userName,
  onClose,
}: {
  userId: string
  userName: string
  onClose: () => void
}) {
  const now = new Date()
  const [docType, setDocType] = useState<'offer_letter' | 'joining_letter' | 'payslip'>('offer_letter')
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1)
  const [payYear, setPayYear] = useState(now.getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      if (docType === 'payslip') {
        await generateDocument(userId, 'payslip', { month: payMonth, year: payYear })
      } else {
        await generateDocument(userId, docType)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Generate Document</h2>
            <p className="text-xs text-slate-500 mt-0.5">for {userName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'offer_letter',   icon: 'mail',         label: 'Offer Letter' },
                { value: 'joining_letter', icon: 'handshake',    label: 'Joining Letter' },
                { value: 'payslip',        icon: 'receipt_long', label: 'Payslip' },
              ].map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => setDocType(value as any)}
                  className={`flex-1 min-w-[120px] px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    docType === value
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-base align-middle mr-1.5">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {docType === 'payslip' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Period</label>
              <div className="flex gap-2">
                <select
                  value={payMonth}
                  onChange={e => setPayMonth(Number(e.target.value))}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {['January','February','March','April','May','June',
                    'July','August','September','October','November','December']
                    .map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={payYear}
                  onChange={e => setPayYear(Number(e.target.value))}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2.5 p-3 bg-teal-50 rounded-lg border border-teal-100">
            <span className="material-symbols-outlined text-teal-500 text-lg shrink-0 mt-0.5">auto_awesome</span>
            <p className="text-xs text-teal-700 leading-relaxed">
              Uses your organisation's default template for this document type. Customise templates at{' '}
              <strong>Settings → Document Templates</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {error && <p className="text-xs text-rose-500 max-w-xs">{error}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
