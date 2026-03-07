import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStudentOnboardingConfig } from './StudentOnboardingContext'
import PersonalInfo from './sections/PersonalInfo'
import ParentsGuardian from './sections/ParentsGuardian'
import AddressInfo from './sections/AddressInfo'
import TransportHostel from './sections/TransportHostel'
import MedicalHistory from './sections/MedicalHistory'
import PreviousSchool from './sections/PreviousSchool'
import OtherDetails from './sections/OtherDetails'
import { addStudent } from '../../../lib/queries/students'
import type { AddStudentInput } from '../../../lib/queries/students'
import { RefreshCw, Copy, Check } from 'lucide-react'

export default function StudentOnboarding() {
  const { config, loading, error } = useStudentOnboardingConfig()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<AddStudentInput>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const updateFormData = (newData: Partial<AddStudentInput>) => {
    setFormData((prev) => ({ ...prev, ...newData }))
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)

    try {
      if (!formData.name || !formData.className) {
        throw new Error("Name and Class Name are strictly required.")
      }

      const result = await addStudent(formData as AddStudentInput)
      setCredentials({ email: result.generatedEmail, password: result.generatedPassword })
      setSuccess(true)
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to add student')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
      <RefreshCw className="w-8 h-8 animate-spin mb-4 text-teal-600" />
      <p>Loading form configuration...</p>
    </div>
  )
  
  if (error) return (
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-8">
      Error loading configuration. Please try again.
    </div>
  )

  if (success) return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admission Successful!</h2>
        <p className="text-gray-600 mb-6">The student's onboarding details have been saved successfully.</p>

        {credentials && (
          <div className="bg-white rounded-xl border border-emerald-200 p-5 mb-6 text-left">
            <h4 className="text-sm font-semibold text-emerald-800 mb-1">Student Login Credentials</h4>
            <p className="text-xs text-emerald-600 mb-3">Save these credentials. The password will not be shown again.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-gray-800">{credentials.email}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.email, 'stu-email')}
                    className="text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    {copiedField === 'stu-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Password</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-gray-800">{credentials.password}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.password, 'stu-pw')}
                    className="text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    {copiedField === 'stu-pw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => { setFormData({}); setSuccess(false); setCredentials(null); queryClient.invalidateQueries({ queryKey: ['nextAdmissionNumber'] }) }}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          Add Another Student
        </button>
      </div>
    </div>
  )

  const enabledSections = Object.values(config.sections).filter(s => s.enabled).length
  const sectionSpacing = enabledSections <= 1 ? 'space-y-6' : 'space-y-12'

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-teal-900/5 border border-white/50 overflow-hidden">
        {enabledSections > 1 && (
          <div className="px-8 py-6 border-b border-gray-100/50 bg-gradient-to-r from-teal-50/50 to-emerald-50/50">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-700 to-emerald-700">
              Student Onboarding
            </h2>
            <p className="text-sm text-teal-700/70 mt-1">Complete the mandatory fields below to enroll a new student.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`p-8 ${sectionSpacing}`}>
          {config.sections.personalInfo.enabled && (
            <PersonalInfo data={formData} updateData={updateFormData} config={config.sections.personalInfo} />
          )}

          {config.sections.parentsGuardian.enabled && (
            <ParentsGuardian data={formData} updateData={updateFormData} config={config.sections.parentsGuardian} />
          )}

          {config.sections.addressInfo.enabled && (
            <AddressInfo data={formData} updateData={updateFormData} config={config.sections.addressInfo} />
          )}

          {config.sections.transportHostel.enabled && (
            <TransportHostel data={formData} updateData={updateFormData} config={config.sections.transportHostel} />
          )}

          {config.sections.medicalHistory.enabled && (
            <MedicalHistory data={formData} updateData={updateFormData} config={config.sections.medicalHistory} />
          )}

          {config.sections.previousSchool.enabled && (
            <PreviousSchool data={formData} updateData={updateFormData} config={config.sections.previousSchool} />
          )}

          {config.sections.otherDetails.enabled && (
            <OtherDetails data={formData} updateData={updateFormData} config={config.sections.otherDetails} />
          )}

          {submitError && (
             <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{submitError}</div>
          )}

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
            >
              {submitting ? 'Processing...' : 'Submit Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
