import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Save, Plus, Trash2, ArrowLeft, Settings, Eye, EyeOff } from 'lucide-react'
import { getOnboardingConfig, updateOnboardingConfig } from '../../lib/queries/students'
import type { StudentOnboardingConfig } from '../../lib/queries/students'
import { defaultOnboardingConfig } from '../students/onboarding/StudentOnboardingContext'
import type { StaffOnboardingConfig } from '../staff/onboarding/StaffOnboardingContext'
import { defaultStaffOnboardingConfig } from '../staff/onboarding/StaffOnboardingContext'

// Field types available for custom fields
const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date Picker' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
]

// Available sections with their field options
const AVAILABLE_SECTIONS = {
  personalInfo: {
    label: 'Personal Information',
    description: 'Basic student information like name, class, gender, etc.',
    availableFields: ['name', 'className', 'gender', 'dateOfBirth', 'bloodGroup', 'religion', 'email', 'phone', 'admissionNumber', 'admissionDate'],
    allowCustomFields: true,
  },
  parentsGuardian: {
    label: 'Parent/Guardian Information',
    description: 'Parent and guardian contact details',
    availableFields: ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'motherOccupation', 'guardianName', 'guardianRelation', 'guardianPhone', 'guardianEmail'],
    allowCustomFields: true,
  },
  addressInfo: {
    label: 'Address Information',
    description: 'Student\'s current and permanent address',
    availableFields: ['currentAddress', 'currentCity', 'currentState', 'currentZipCode', 'currentCountry', 'permanentAddress', 'permanentCity', 'permanentState', 'permanentZipCode', 'permanentCountry'],
    allowCustomFields: true,
  },
  medicalHistory: {
    label: 'Medical History',
    description: 'Health information and allergies',
    availableFields: ['allergies', 'medications', 'pastConditions'],
    allowCustomFields: true,
  },
  previousSchool: {
    label: 'Previous School',
    description: 'Information about previous educational institution',
    availableFields: ['previousSchoolName', 'previousSchoolAddress'],
    allowCustomFields: true,
  },
  transportHostel: {
    label: 'Transport & Hostel',
    description: 'Bus route and hostel accommodation details',
    availableFields: ['busRoute', 'hostelName', 'hostelRoom', 'hostelType'],
    allowCustomFields: true,
  },
  otherDetails: {
    label: 'Custom Fields',
    description: 'General custom fields not fitting other sections',
    availableFields: [],
    allowCustomFields: true,
  },
}

// Staff sections configuration
const AVAILABLE_STAFF_SECTIONS = {
  personalInfo: {
    label: 'Personal Information',
    description: 'Basic staff information like name, designation, gender, etc.',
    availableFields: ['name', 'designation', 'department', 'qualification', 'gender', 'dateOfBirth', 'bloodGroup', 'maritalStatus', 'dateOfJoining', 'phone', 'personalEmail'],
    allowCustomFields: true,
  },
  address: {
    label: 'Address Information',
    description: 'Staff residential address details',
    availableFields: ['address', 'city', 'state', 'zipCode', 'country'],
    allowCustomFields: true,
  },
  bankDetails: {
    label: 'Bank Account Details',
    description: 'Bank account for salary transfers',
    availableFields: ['bankAccountName', 'bankAccountNumber', 'bankName', 'bankIfsc', 'bankBranch'],
    allowCustomFields: true,
  },
  salary: {
    label: 'Salary Details',
    description: 'Monthly salary breakdown',
    availableFields: ['basicPay', 'allowances', 'deductions'],
    allowCustomFields: true,
  },
  documents: {
    label: 'Documents',
    description: 'Uploaded documents and certificates',
    availableFields: [],
    allowCustomFields: true,
  },
  emergencyContact: {
    label: 'Emergency Contact',
    description: 'Emergency contact information',
    availableFields: ['emergencyName', 'emergencyPhone', 'emergencyRelation'],
    allowCustomFields: true,
  },
  additionalInfo: {
    label: 'Additional Information',
    description: 'General custom fields',
    availableFields: [],
    allowCustomFields: true,
  },
}

export function OnboardingConfigPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student')
  const [previewMode, setPreviewMode] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Student config
  const { data: config, isLoading } = useQuery({
    queryKey: ['studentOnboardingConfig'],
    queryFn: getOnboardingConfig,
    staleTime: 5 * 60_000,
    retry: 2,
  })

  const [localConfig, setLocalConfig] = useState<StudentOnboardingConfig>(defaultOnboardingConfig)
  const [staffConfig, setStaffConfig] = useState<StaffOnboardingConfig>(defaultStaffOnboardingConfig)

  const updateMutation = useMutation({
    mutationFn: updateOnboardingConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentOnboardingConfig'] })
      alert('Configuration saved successfully!')
    },
    onError: (error) => {
      alert(`Failed to save configuration: ${error.message}`)
    },
  })

  // Initialize local config when data loads
  useEffect(() => {
    if (config && !hasLoaded) {
      const hasSections = config.sections && Object.keys(config.sections).length > 0
      if (hasSections) {
        setLocalConfig(config)
      }
      setHasLoaded(true)
    }
  }, [config, hasLoaded])

  if (isLoading && !hasLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Loading configuration...</p>
        </div>
      </div>
    )
  }

  const toggleSection = (sectionKey: keyof typeof localConfig.sections) => {
    setLocalConfig({
      ...localConfig,
      sections: {
        ...localConfig.sections,
        [sectionKey]: {
          ...localConfig.sections[sectionKey],
          enabled: !localConfig.sections[sectionKey].enabled,
        },
      },
    })
  }

  const toggleMandatoryField = (sectionKey: keyof typeof localConfig.sections, field: string) => {
    const section = localConfig.sections[sectionKey]
    if (!('mandatoryFields' in section)) return // Skip otherDetails section
    
    const mandatoryFields = section.mandatoryFields || []
    const newMandatoryFields = mandatoryFields.includes(field)
      ? mandatoryFields.filter((f: string) => f !== field)
      : [...mandatoryFields, field]

    setLocalConfig({
      ...localConfig,
      sections: {
        ...localConfig.sections,
        [sectionKey]: {
          ...section,
          mandatoryFields: newMandatoryFields,
        },
      },
    })
  }

  const addCustomField = (sectionKey: keyof typeof localConfig.sections) => {
    const section = localConfig.sections[sectionKey]
    const newField: import('../../lib/queries/students').CustomField = {
      id: `custom_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      helpText: '',
      order: (section.customFields?.length || 0) + 1,
    }

    setLocalConfig({
      ...localConfig,
      sections: {
        ...localConfig.sections,
        [sectionKey]: {
          ...section,
          customFields: [...(section.customFields || []), newField],
        },
      },
    })
  }

  const updateCustomField = (sectionKey: keyof typeof localConfig.sections, fieldId: string, updates: any) => {
    const section = localConfig.sections[sectionKey]
    const customFields = section.customFields || []
    const newCustomFields = customFields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    )

    setLocalConfig({
      ...localConfig,
      sections: {
        ...localConfig.sections,
        [sectionKey]: {
          ...section,
          customFields: newCustomFields,
        },
      },
    })
  }

  const removeCustomField = (sectionKey: keyof typeof localConfig.sections, fieldId: string) => {
    const section = localConfig.sections[sectionKey]
    const customFields = section.customFields || []
    const newCustomFields = customFields.filter(field => field.id !== fieldId)

    setLocalConfig({
      ...localConfig,
      sections: {
        ...localConfig.sections,
        [sectionKey]: {
          ...section,
          customFields: newCustomFields,
        },
      },
    })
  }

  const handleSave = () => {
    updateMutation.mutate(localConfig)
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default configuration?')) {
      queryClient.invalidateQueries({ queryKey: ['studentOnboardingConfig'] })
      window.location.reload()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 text-slate-600 hover:text-teal-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Onboarding Configuration</h1>
            <p className="text-slate-600 mt-2">
              Customize the onboarding forms for students and staff
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'student'
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Student Onboarding
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'staff'
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Staff Onboarding
            <span className="ml-2 text-xs text-slate-400">(Coming Soon)</span>
          </button>
        </div>
      </div>

      {/* Student Onboarding Config */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          {/* Section Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Form Sections</h2>
            <p className="text-sm text-slate-600 mb-6">
              Enable or disable sections of the student onboarding form. Click on a section to configure mandatory fields.
            </p>

            <div className="space-y-4">
              {Object.entries(AVAILABLE_SECTIONS).map(([key, section]) => {
                const sectionKey = key as keyof typeof localConfig.sections
                const sectionConfig = localConfig.sections[sectionKey]
                const isEnabled = sectionConfig?.enabled || false

                return (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4 bg-slate-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleSection(sectionKey)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                          <div>
                            <h3 className="font-semibold text-slate-900">{section.label}</h3>
                            <p className="text-sm text-slate-600">{section.description}</p>
                          </div>
                        </div>
                      </div>
                      {isEnabled && section.availableFields.length > 0 && (
                        <span className="text-sm text-slate-500">
                          {('mandatoryFields' in sectionConfig ? sectionConfig.mandatoryFields?.length : 0) || 0} mandatory fields
                        </span>
                      )}
                    </div>

                    {/* Mandatory Fields Configuration */}
                    {isEnabled && section.availableFields.length > 0 && 'mandatoryFields' in sectionConfig && (
                      <div className="p-4 border-t border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          Mandatory Fields
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {section.availableFields.map(field => {
                            const isMandatory = (sectionConfig as any).mandatoryFields?.includes(field) || false
                            return (
                              <label
                                key={field}
                                className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isMandatory}
                                  onChange={() => toggleMandatoryField(sectionKey, field)}
                                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-slate-700 capitalize">
                                  {field.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom Fields for this section */}
                    {isEnabled && section.allowCustomFields && (
                      <div className="p-4 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-700">
                            Custom Fields
                            {sectionConfig.customFields?.length ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({sectionConfig.customFields.length} added)
                              </span>
                            ) : null}
                          </h4>
                          <button
                            onClick={() => addCustomField(sectionKey)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add Field
                          </button>
                        </div>

                        {sectionConfig.customFields && sectionConfig.customFields.length > 0 ? (
                          <div className="space-y-3">
                            {sectionConfig.customFields.map((field, index) => (
                              <CustomFieldEditor
                                key={field.id}
                                field={field}
                                index={index}
                                onUpdate={(updates) => updateCustomField(sectionKey, field.id, updates)}
                                onRemove={() => removeCustomField(sectionKey, field.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500">No custom fields added to this section</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Staff Onboarding Config */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Staff Onboarding Configuration</h1>
              <p className="text-slate-600 mt-2">
                Customize the onboarding forms for staff members
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStaffConfig(defaultStaffOnboardingConfig)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => alert('Staff config saving will be implemented with backend support')}
                disabled={false}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>

          {/* Staff Sections */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Form Sections</h2>
            <p className="text-sm text-slate-600 mb-6">
              Enable or disable sections of the staff onboarding form. Click on a section to configure mandatory fields and custom fields.
            </p>

            <div className="space-y-4">
              {Object.entries(AVAILABLE_STAFF_SECTIONS).map(([key, section]) => {
                const sectionKey = key as keyof typeof staffConfig.sections
                const sectionConfig = staffConfig.sections[sectionKey]
                const isEnabled = sectionConfig?.enabled || false

                return (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4 bg-slate-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => setStaffConfig({
                                ...staffConfig,
                                sections: {
                                  ...staffConfig.sections,
                                  [sectionKey]: {
                                    ...sectionConfig,
                                    enabled: !isEnabled,
                                  },
                                },
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                          <div>
                            <h3 className="font-semibold text-slate-900">{section.label}</h3>
                            <p className="text-sm text-slate-600">{section.description}</p>
                          </div>
                        </div>
                      </div>
                      {isEnabled && section.availableFields.length > 0 && (
                        <span className="text-sm text-slate-500">
                          {('mandatoryFields' in sectionConfig ? (sectionConfig as any).mandatoryFields?.length : 0) || 0} mandatory fields
                        </span>
                      )}
                    </div>

                    {/* Mandatory Fields Configuration */}
                    {isEnabled && section.availableFields.length > 0 && 'mandatoryFields' in sectionConfig && (
                      <div className="p-4 border-t border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          Mandatory Fields
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {section.availableFields.map(field => {
                            const isMandatory = (sectionConfig as any).mandatoryFields?.includes(field) || false
                            return (
                              <label
                                key={field}
                                className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isMandatory}
                                  onChange={() => {
                                    const mandatoryFields = (sectionConfig as any).mandatoryFields || []
                                    const newMandatoryFields = isMandatory
                                      ? mandatoryFields.filter((f: string) => f !== field)
                                      : [...mandatoryFields, field]
                                    setStaffConfig({
                                      ...staffConfig,
                                      sections: {
                                        ...staffConfig.sections,
                                        [sectionKey]: {
                                          ...sectionConfig,
                                          mandatoryFields: newMandatoryFields,
                                        },
                                      },
                                    })
                                  }}
                                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-slate-700 capitalize">
                                  {field.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom Fields for this section */}
                    {isEnabled && section.allowCustomFields && (
                      <div className="p-4 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-700">
                            Custom Fields
                            {(sectionConfig as any).customFields?.length ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({(sectionConfig as any).customFields.length} added)
                              </span>
                            ) : null}
                          </h4>
                          <button
                            onClick={() => {
                              const newField: import('../../lib/queries/students').CustomField = {
                                id: `custom_${Date.now()}`,
                                label: 'New Field',
                                type: 'text',
                                required: false,
                                options: [],
                                placeholder: '',
                                helpText: '',
                                order: ((sectionConfig as any).customFields?.length || 0) + 1,
                              }
                              setStaffConfig({
                                ...staffConfig,
                                sections: {
                                  ...staffConfig.sections,
                                  [sectionKey]: {
                                    ...sectionConfig,
                                    customFields: [...((sectionConfig as any).customFields || []), newField],
                                  },
                                },
                              })
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add Field
                          </button>
                        </div>

                        {(sectionConfig as any).customFields && (sectionConfig as any).customFields.length > 0 ? (
                          <div className="space-y-3">
                            {(sectionConfig as any).customFields.map((field: any, index: number) => (
                              <CustomFieldEditor
                                key={field.id}
                                field={field}
                                index={index}
                                onUpdate={(updates) => {
                                  const customFields = (sectionConfig as any).customFields || []
                                  const newCustomFields = customFields.map((f: any) =>
                                    f.id === field.id ? { ...f, ...updates } : f
                                  )
                                  setStaffConfig({
                                    ...staffConfig,
                                    sections: {
                                      ...staffConfig.sections,
                                      [sectionKey]: {
                                        ...sectionConfig,
                                        customFields: newCustomFields,
                                      },
                                    },
                                  })
                                }}
                                onRemove={() => {
                                  const customFields = (sectionConfig as any).customFields || []
                                  const newCustomFields = customFields.filter((f: any) => f.id !== field.id)
                                  setStaffConfig({
                                    ...staffConfig,
                                    sections: {
                                      ...staffConfig.sections,
                                      [sectionKey]: {
                                        ...sectionConfig,
                                        customFields: newCustomFields,
                                      },
                                    },
                                  })
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500">No custom fields added to this section</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Custom Field Editor Component
function CustomFieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: any
  index: number
  onUpdate: (updates: any) => void
  onRemove: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left"
        >
          <h3 className="font-semibold text-slate-900">
            {field.label || 'Untitled Field'} #{index + 1}
          </h3>
          <p className="text-sm text-slate-600 capitalize">{field.type} input</p>
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          title="Remove field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Field Label *
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Emergency Contact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Field Type *
              </label>
              <select
                value={field.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Placeholder Text
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Enter emergency contact name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Help Text
              </label>
              <input
                type="text"
                value={field.helpText || ''}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Provide a contact person for emergencies"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">Required field</span>
          </div>

          {/* Options for select/multiselect */}
          {(field.type === 'select' || field.type === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={(field.options || []).join(', ')}
                onChange={(e) => onUpdate({ options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Option 1, Option 2, Option 3"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
