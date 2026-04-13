import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { onboardStaff, previewLoginEmail } from '../../../lib/queries/org-users'
import type { OnboardStaffInput, OnboardStaffResult } from '../../../lib/queries/org-users'
import { resolveOrg } from '../../../lib/queries/user'
import { fetchRoles, assignRoleToUser } from '../../../lib/queries/roles'
import { assignClassToTeacher } from '../../../lib/queries/teacher'
import { fetchClasses } from '../../../lib/queries/dashboard'
import { StaffOnboardingProvider, useStaffOnboardingConfig } from './StaffOnboardingContext'
import StaffPersonalInfo from './sections/PersonalInfo'
import StaffAddress from './sections/Address'
import StaffBankDetails from './sections/BankDetails'
import StaffSalary from './sections/Salary'
import RoleAssignment from './sections/RoleAssignment'
import { Copy, Check, FileDown } from 'lucide-react'
import { Route } from '../../../routes/_authenticated/add-staff'

function StaffOnboardingForm() {
  const qc = useQueryClient()
  const { config } = useStaffOnboardingConfig()
  const { orgSlug } = Route.useRouteContext()
  
  // Resolve org to get orgId for role assignment
  const { data: orgInfo } = useQuery({
    queryKey: ['resolveOrg', orgSlug],
    queryFn: () => resolveOrg(orgSlug),
    enabled: !!orgSlug,
    staleTime: 10 * 60_000,
  })
  
  // Fetch available roles
  const { data: roles = [] } = useQuery({
    queryKey: ['orgRoles', orgInfo?.orgId],
    queryFn: () => fetchRoles(orgInfo!.orgId),
    enabled: !!orgInfo?.orgId,
    staleTime: 5 * 60_000,
  })
  
  // Filter out non-staff roles (parent, student) for staff onboarding
  const staffRoles = (roles as any[]).filter(
    (role: any) => role.slug !== 'parent' && role.slug !== 'student'
  )
  
  // Fetch classes for teacher role
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    enabled: true,
    staleTime: 5 * 60_000,
  })
  
  const [result, setResult] = useState<OnboardStaffResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [_assignedRoleId, _setAssignedRoleId] = useState<string>('')
  const [_assignedClass, _setAssignedClass] = useState<{ className: string; isClassTeacher: boolean } | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [showClassAssignment, setShowClassAssignment] = useState(false)

  const [form, setForm] = useState<Partial<OnboardStaffInput>>({
    name: '',
    personalEmail: '',
    phone: '',
    password: '',
    designation: '',
    department: '',
    qualification: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfsc: '',
    bankBranch: '',
    dateOfJoining: '',
  })

  const [salary, setSalary] = useState({ basicPay: '', allowances: '', deductions: '' })

  const updateForm = (data: Partial<OnboardStaffInput>) => setForm((f: Partial<OnboardStaffInput>) => ({ ...f, ...data }))

  const [loginEmailPreview, setLoginEmailPreview] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const name = form.name?.trim()
    if (!name) {
      setLoginEmailPreview('')
      return
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.')
    setLoginEmailPreview(`${slug}@school.com`)

    setLoadingPreview(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const email = await previewLoginEmail(name)
        setLoginEmailPreview(email)
      } catch {
        // Keep local preview on error
      } finally {
        setLoadingPreview(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form.name])

  const mutation = useMutation({
    mutationFn: () => {
      const input: OnboardStaffInput = {
        name: form.name || '',
        personalEmail: form.personalEmail || undefined,
        phone: form.phone || undefined,
        password: form.password || undefined,
        designation: form.designation || undefined,
        department: form.department || undefined,
        qualification: form.qualification || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        maritalStatus: form.maritalStatus || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        country: form.country || undefined,
        bankAccountName: form.bankAccountName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankName: form.bankName || undefined,
        bankIfsc: form.bankIfsc || undefined,
        bankBranch: form.bankBranch || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
      }

      if (salary.basicPay) {
        input.basicPay = Math.round(parseFloat(salary.basicPay) * 100)
        input.allowances = Math.round(parseFloat(salary.allowances || '0') * 100)
        input.deductions = Math.round(parseFloat(salary.deductions || '0') * 100)
      }

      return onboardStaff(input)
    },
    onSuccess: async (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['orgUsers'] })
      
      // Automatically assign the selected role if one was chosen
      if (selectedRoleId && data.user?.id && orgInfo?.orgId) {
        try {
          await assignRoleToUser(data.user.id, orgInfo.orgId, selectedRoleId)
          _setAssignedRoleId(selectedRoleId)
          qc.invalidateQueries({ queryKey: ['myRoles'] })
          qc.invalidateQueries({ queryKey: ['myPermissions'] })
        } catch (err: any) {
          console.error('Failed to assign role:', err)
          // Don't block the success page, just log the error
        }
      }
      
      // Automatically assign class if teacher role and class selected
      if (selectedClass && data.user?.id && showClassAssignment) {
        try {
          await assignClassToTeacher(data.user.id, selectedClass, isClassTeacher)
          _setAssignedClass({ className: selectedClass, isClassTeacher })
          qc.invalidateQueries({ queryKey: ['myClasses'] })
          qc.invalidateQueries({ queryKey: ['myStudents'] })
        } catch (err: any) {
          console.error('Failed to assign class:', err)
          // Don't block the success page, just log the error
        }
      }
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to onboard staff')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!form.name) {
      setSubmitError('Name is required')
      return
    }

    mutation.mutate()
  }

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleGenerateOfferLetter = async () => {
    if (!result?.user?.id) return
    setGeneratingPdf(true)
    try {
      // TODO: Implement offer letter generation
      window.open(`/api/offer-letter/${result.user.id}`, '_blank')
    } catch (error) {
      console.error('Failed to generate offer letter:', error)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Extract userId for role assignment (avoids TS narrowing issues)
  const userId = result ? result.user?.id : undefined

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Staff Onboarded Successfully!</h2>
            <p className="text-slate-600 mt-2">Account credentials have been generated</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Employee ID</p>
              <p className="text-lg font-bold text-slate-900">{result.employeeId}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Login Email</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">{result.generatedEmail}</p>
                <button
                  onClick={() => result.generatedEmail && handleCopy(result.generatedEmail, 'email')}
                  className="p-2 hover:bg-slate-200 rounded transition-colors"
                >
                  {copied === 'email' ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Temporary Password</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">{result.generatedPassword}</p>
                <button
                  onClick={() => result.generatedPassword && handleCopy(result.generatedPassword, 'password')}
                  className="p-2 hover:bg-slate-200 rounded transition-colors"
                >
                  {copied === 'password' ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGenerateOfferLetter}
              disabled={generatingPdf}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
            >
              <FileDown className="w-5 h-5" />
              {generatingPdf ? 'Generating...' : 'Generate Offer Letter (PDF)'}
            </button>

            <button
              onClick={() => {
                setResult(null)
                _setAssignedRoleId('')
                _setAssignedClass(null)
                setSelectedRoleId('')
                setSelectedClass('')
                setIsClassTeacher(false)
                setShowClassAssignment(false)
                setForm({
                  name: '', personalEmail: '', phone: '', password: '',
                  designation: '', department: '', qualification: '',
                  dateOfBirth: '', gender: '', bloodGroup: '', maritalStatus: '',
                  address: '', city: '', state: '', zipCode: '', country: 'India',
                  bankAccountName: '', bankAccountNumber: '', bankName: '',
                  bankIfsc: '', bankBranch: '', dateOfJoining: '',
                })
                setSalary({ basicPay: '', allowances: '', deductions: '' })
              }}
              className="w-full px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
            >
              Onboard Another Staff Member
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Add Staff Member</h1>
            <p className="text-slate-600 mt-1">Complete the form below to onboard a new staff member</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <StaffPersonalInfo
            data={form}
            updateData={updateForm}
            config={config.sections.personalInfo}
            loginEmailPreview={loginEmailPreview}
            loadingPreview={loadingPreview}
          />

          <StaffAddress
            data={form}
            updateData={updateForm}
            config={config.sections.address}
          />

          <StaffBankDetails
            data={form}
            updateData={updateForm}
            config={config.sections.bankDetails}
          />

          <StaffSalary
            data={form}
            updateData={updateForm}
            salary={salary}
            updateSalary={setSalary}
            config={config.sections.salary}
          />
        </div>

        {/* Role Selection Section */}
        {orgInfo?.orgId && roles.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Assign Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-slate-500">(optional)</span>
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => {
                    setSelectedRoleId(e.target.value)
                    const selectedRole = (staffRoles as any[]).find((r: any) => r.id === e.target.value)
                    const isTeacher = selectedRole?.slug === 'teacher' || selectedRole?.name.toLowerCase().includes('teacher')
                    setShowClassAssignment(isTeacher)
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                >
                  <option value="">Select a role (optional)</option>
                  {((staffRoles as any[]).map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.isSystem && '(System)'}
                    </option>
                  )))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This role determines the user's permissions and access level
                </p>
              </div>
            </div>

            {/* Class Teacher Assignment - Only shown when Teacher role is selected */}
            {showClassAssignment && classes.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FileDown className="w-4 h-4" />
                  Class Assignment (Teacher)
                </h4>
                <p className="text-xs text-blue-700 mb-4">
                  Assign this teacher to a class. You can also make them a Class Teacher (Homeroom Teacher).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select class</option>
                      {((classes as string[]).map((cls: string) => (
                        <option key={cls} value={cls}>{cls}</option>
                      )))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={isClassTeacher}
                        onChange={(e) => setIsClassTeacher(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-900">Class Teacher</span>
                    </label>
                  </div>

                  <div className="text-xs text-blue-600 flex items-end pb-2">
                    Class will be assigned after staff creation
                  </div>
                </div>
              </div>
            )}

            {classes.length === 0 && showClassAssignment && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  No classes found. Please create classes first in Settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Role & Class Assignment - Only shown after staff is created */}
        {userId && orgInfo?.orgId && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Additional Assignments</h3>
            <RoleAssignment
              userId={userId}
              organisationId={orgInfo.orgId}
              onRoleAssigned={(roleId) => _setAssignedRoleId(roleId)}
              onClassAssigned={(className, isClassTeacher) =>
                _setAssignedClass({ className, isClassTeacher })
              }
            />
          </div>
        )}

        {/* Password Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Account Password</h3>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (optional - auto-generated if blank)
            </label>
            <input
              type="password"
              value={form.password || ''}
              onChange={(e) => updateForm({ password: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Leave blank for auto-generated password"
            />
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            type="submit"
            disabled={!form.name || mutation.isPending}
            className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {mutation.isPending ? 'Processing...' : 'Submit Admission'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AddStaffPage() {
  return (
    <StaffOnboardingProvider>
      <StaffOnboardingForm />
    </StaffOnboardingProvider>
  )
}
