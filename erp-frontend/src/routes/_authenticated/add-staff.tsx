import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { onboardStaff, previewLoginEmail } from '../../lib/queries/org-users'
import type { OnboardStaffInput, OnboardStaffResult } from '../../lib/queries/org-users'
import { generateOfferLetterForUser } from '../../lib/offer-letter'

export const Route = createFileRoute('/_authenticated/add-staff')({
  component: AddStaffPage,
})

function AddStaffPage() {
  const qc = useQueryClient()
  const { orgSlug } = Route.useRouteContext()
  const [result, setResult] = useState<OnboardStaffResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const [form, setForm] = useState<OnboardStaffInput>({
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

  const set = (field: keyof OnboardStaffInput, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const [loginEmailPreview, setLoginEmailPreview] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const name = form.name.trim()
    if (!name) {
      setLoginEmailPreview('')
      return
    }

    // Show instant local preview while waiting for backend
    if (orgSlug) {
      const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.')
      setLoginEmailPreview(slug ? `${slug}@${orgSlug}.com` : '')
    }

    setLoadingPreview(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const email = await previewLoginEmail(name)
        setLoginEmailPreview(email)
      } catch {
        // Keep the local preview on error
      } finally {
        setLoadingPreview(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form.name, orgSlug])

  const mutation = useMutation({
    mutationFn: () => {
      const input: OnboardStaffInput = {
        ...form,
        password: form.password || undefined,
        phone: form.phone || undefined,
      }
      // Only include salary if basicPay is set
      if (salary.basicPay) {
        input.basicPay = Math.round(parseFloat(salary.basicPay) * 100)
        input.allowances = Math.round(parseFloat(salary.allowances || '0') * 100)
        input.deductions = Math.round(parseFloat(salary.deductions || '0') * 100)
      }
      // Clean empty strings
      for (const key of Object.keys(input) as Array<keyof OnboardStaffInput>) {
        if (input[key] === '') delete input[key]
      }
      return onboardStaff(input)
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['orgUsers'] })
    },
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleGenerateLetter = async () => {
    if (!result) return
    setGeneratingPdf(true)
    try {
      await generateOfferLetterForUser(result.user.id, 'offer')
    } catch (err) {
      console.error('Failed to generate offer letter:', err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // After successful onboarding
  if (result) {
    return (
      <div>
        <Link to="/users" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>

        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center mb-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Staff Onboarded Successfully</h2>
            <p className="text-sm text-gray-500">Employee ID: <strong>{result.employeeId}</strong></p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Login Credentials</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400">Email {result.generatedEmail ? '(auto-generated)' : ''}</p>
                  <p className="text-sm font-medium text-gray-800">{result.user.email}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(result.user.email, 'email')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {result.generatedPassword && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-400">Password</p>
                    <p className="text-sm font-mono font-medium text-gray-800">{result.generatedPassword}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.generatedPassword!, 'password')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copied === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateLetter}
              disabled={generatingPdf}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              {generatingPdf ? 'Generating...' : 'Generate Offer Letter (PDF)'}
            </button>
            <Link
              to="/users"
              className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Done
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/users" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add New Staff</h2>
          <p className="text-sm text-gray-500 mt-0.5">Onboard a new employee with their details</p>
        </div>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {(mutation.error as Error)?.message || 'Failed to onboard staff. Please check the details and try again.'}
        </div>
      )}

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500">person</span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 min-h-[38px] flex items-center gap-2">
                {loginEmailPreview ? (
                  <>
                    <span>{loginEmailPreview}</span>
                    {loadingPreview && <span className="text-gray-400 text-xs">(checking...)</span>}
                  </>
                ) : (
                  <span className="text-gray-400 italic">Type a name to preview</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Auto-generated from name. Used for login.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
              <input
                type="email"
                value={form.personalEmail}
                onChange={e => set('personalEmail', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="personal@gmail.com"
              />
              <p className="text-xs text-gray-400 mt-1">Optional. Staff member's personal contact email.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input
                value={form.designation}
                onChange={e => set('designation', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Senior Teacher"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                value={form.department}
                onChange={e => set('department', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
              <input
                value={form.qualification}
                onChange={e => set('qualification', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. M.Ed, B.Tech"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={e => set('bloodGroup', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
              <select
                value={form.maritalStatus}
                onChange={e => set('maritalStatus', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
              <input
                type="date"
                value={form.dateOfJoining}
                onChange={e => set('dateOfJoining', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">location_on</span>
            Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="House no, street, area"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                value={form.state}
                onChange={e => set('state', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                value={form.zipCode}
                onChange={e => set('zipCode', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">account_balance</span>
            Bank Account Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
              <input
                value={form.bankAccountName}
                onChange={e => set('bankAccountName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                value={form.bankAccountNumber}
                onChange={e => set('bankAccountNumber', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                value={form.bankName}
                onChange={e => set('bankName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
              <input
                value={form.bankIfsc}
                onChange={e => set('bankIfsc', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. SBIN0001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <input
                value={form.bankBranch}
                onChange={e => set('bankBranch', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Salary */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">payments</span>
            Salary Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Basic Pay (INR/month)</label>
              <input
                type="number"
                step="0.01"
                value={salary.basicPay}
                onChange={e => setSalary(s => ({ ...s, basicPay: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 25000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowances (INR/month)</label>
              <input
                type="number"
                step="0.01"
                value={salary.allowances}
                onChange={e => setSalary(s => ({ ...s, allowances: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deductions (INR/month)</label>
              <input
                type="number"
                step="0.01"
                value={salary.deductions}
                onChange={e => setSalary(s => ({ ...s, deductions: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 2000"
              />
            </div>
          </div>
          {salary.basicPay && (
            <div className="mt-3 text-sm text-gray-500">
              Net Pay: <strong className="text-gray-900">
                {'\u20B9'}{((parseFloat(salary.basicPay || '0') + parseFloat(salary.allowances || '0') - parseFloat(salary.deductions || '0'))).toLocaleString('en-IN')}
              </strong> /month
            </div>
          )}
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">lock</span>
            Account Password
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Leave blank to auto-generate"
              />
              <p className="text-xs text-gray-400 mt-1">If left blank, a secure password will be auto-generated.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            to="/users"
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || mutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Onboarding...' : 'Add Staff'}
          </button>
        </div>
      </div>
    </div>
  )
}
