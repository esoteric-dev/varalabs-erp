import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getOnboardingConfig } from '../../../lib/queries/students'
import type { StudentOnboardingConfig } from '../../../lib/queries/students'

export const defaultOnboardingConfig: StudentOnboardingConfig = {
  sections: {
    personalInfo: { enabled: true, mandatoryFields: ['name', 'className', 'dateOfBirth'], customFields: [] },
    parentsGuardian: { enabled: true, mandatoryFields: ['fatherName', 'motherName'], customFields: [] },
    addressInfo: { enabled: true, mandatoryFields: ['currentAddress', 'currentCity'], customFields: [] },
    transportHostel: { enabled: false, mandatoryFields: [], customFields: [] },
    medicalHistory: { enabled: false, mandatoryFields: [], customFields: [] },
    previousSchool: { enabled: false, mandatoryFields: [], customFields: [] },
    otherDetails: { enabled: false, customFields: [] },
  }
}

interface StudentOnboardingContextType {
  config: StudentOnboardingConfig
  loading: boolean
  error: Error | null
  refreshConfig: () => Promise<void>
}

const StudentOnboardingContext = createContext<StudentOnboardingContextType | undefined>(undefined)

export function StudentOnboardingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StudentOnboardingConfig>(defaultOnboardingConfig)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOnboardingConfig()
      
      // Check if config has actual content or is just empty {}
      const hasContent = data && data.sections && Object.keys(data.sections).length > 0
      
      if (hasContent) {
        setConfig(data)
      } else {
        // No config saved yet — use default
        console.log('No onboarding config found, using defaults')
        setConfig(defaultOnboardingConfig)
      }
    } catch (err: any) {
      // If the query fails (e.g. no org_settings row yet),
      // fallback to defaults instead of blocking the form
      console.warn('Could not load onboarding config, using defaults:', err.message)
      setConfig(defaultOnboardingConfig)
      // Don't set error — let the form render with defaults
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <StudentOnboardingContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig }}>
      {children}
    </StudentOnboardingContext.Provider>
  )
}

export function useStudentOnboardingConfig() {
  const context = useContext(StudentOnboardingContext)
  if (context === undefined) {
    throw new Error('useStudentOnboardingConfig must be used within a StudentOnboardingProvider')
  }
  return context
}
