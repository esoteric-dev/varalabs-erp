import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { CustomField } from '../../../lib/queries/students'

export interface StaffOnboardingConfig {
  sections: {
    personalInfo: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    address: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    bankDetails: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    salary: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    documents: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    emergencyContact: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
    additionalInfo: { enabled: boolean; customFields?: CustomField[] }
  }
}

export const defaultStaffOnboardingConfig: StaffOnboardingConfig = {
  sections: {
    personalInfo: { enabled: true, mandatoryFields: ['name', 'dateOfBirth', 'gender'], customFields: [] },
    address: { enabled: true, mandatoryFields: ['address', 'city', 'state'], customFields: [] },
    bankDetails: { enabled: true, mandatoryFields: ['bankAccountName', 'bankAccountNumber', 'bankName'], customFields: [] },
    salary: { enabled: true, mandatoryFields: [], customFields: [] },
    documents: { enabled: false, mandatoryFields: [], customFields: [] },
    emergencyContact: { enabled: false, mandatoryFields: [], customFields: [] },
    additionalInfo: { enabled: false, customFields: [] },
  }
}

interface StaffOnboardingContextType {
  config: StaffOnboardingConfig
  loading: boolean
  error: Error | null
  refreshConfig: () => Promise<void>
}

const StaffOnboardingContext = createContext<StaffOnboardingContextType | undefined>(undefined)

export function StaffOnboardingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StaffOnboardingConfig>(defaultStaffOnboardingConfig)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      // TODO: Implement backend query for staff config
      // For now, use default
      console.log('Using default staff onboarding config')
      setConfig(defaultStaffOnboardingConfig)
    } catch (err: any) {
      console.warn('Could not load staff onboarding config, using defaults:', err.message)
      setConfig(defaultStaffOnboardingConfig)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <StaffOnboardingContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig }}>
      {children}
    </StaffOnboardingContext.Provider>
  )
}

export function useStaffOnboardingConfig() {
  const context = useContext(StaffOnboardingContext)
  if (context === undefined) {
    throw new Error('useStaffOnboardingConfig must be used within a StaffOnboardingProvider')
  }
  return context
}
