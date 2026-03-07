import { useState, useEffect } from 'react'
import { getOnboardingConfig, updateOnboardingConfig, type StudentOnboardingConfig } from '../../lib/queries/students'
import { defaultOnboardingConfig } from '../students/onboarding/StudentOnboardingContext'
import { Save, Plus, Trash2 } from 'lucide-react'

const AVAILABLE_FIELDS = {
  personalInfo: [
    { name: 'name', label: 'Student Name' },
    { name: 'className', label: 'Class Name' },
    { name: 'gender', label: 'Gender' },
    { name: 'dateOfBirth', label: 'Date of Birth' },
    { name: 'bloodGroup', label: 'Blood Group' },
    { name: 'religion', label: 'Religion' },
    { name: 'email', label: 'Email Address' },
    { name: 'phone', label: 'Phone Number' },
    { name: 'admissionNumber', label: 'Admission Number' },
    { name: 'admissionDate', label: 'Admission Date' },
  ],
  parentsGuardian: [
    { name: 'fatherName', label: "Father's Name" },
    { name: 'fatherPhone', label: "Father's Phone" },
    { name: 'fatherOccupation', label: "Father's Occupation" },
    { name: 'motherName', label: "Mother's Name" },
    { name: 'motherPhone', label: "Mother's Phone" },
    { name: 'motherOccupation', label: "Mother's Occupation" },
    { name: 'guardianName', label: "Guardian's Name" },
    { name: 'guardianRelation', label: "Guardian's Relation" },
    { name: 'guardianPhone', label: "Guardian's Phone" },
    { name: 'guardianEmail', label: "Guardian's Email" },
  ],
  addressInfo: [
    { name: 'currentAddress', label: 'Current Address' },
    { name: 'currentCity', label: 'Current City' },
    { name: 'currentState', label: 'Current State' },
    { name: 'currentZipCode', label: 'Current Zip Code' },
    { name: 'currentCountry', label: 'Current Country' },
    { name: 'permanentAddress', label: 'Permanent Address' },
    { name: 'permanentCity', label: 'Permanent City' },
    { name: 'permanentState', label: 'Permanent State' },
    { name: 'permanentZipCode', label: 'Permanent Zip Code' },
    { name: 'permanentCountry', label: 'Permanent Country' },
  ],
  medicalHistory: [
    { name: 'allergies', label: 'Allergies' },
    { name: 'medications', label: 'Medications' },
    { name: 'pastConditions', label: 'Past Conditions' },
  ],
  previousSchool: [
    { name: 'previousSchoolName', label: 'School Name' },
    { name: 'previousSchoolAddress', label: 'School Address' },
  ]
}

export default function AdminSettings() {
  const [config, setConfig] = useState<StudentOnboardingConfig>(defaultOnboardingConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [newCustomField, setNewCustomField] = useState({ id: '', label: '', type: 'text', required: false })

  useEffect(() => {
    async function load() {
      try {
        const data = await getOnboardingConfig()
        if (data && data.sections) {
          setConfig(data)
        }
      } catch (err) {
        console.error("Failed to load config", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      await updateOnboardingConfig(config)
      setMessage({ text: 'Onboarding settings saved successfully!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 5000)
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: keyof StudentOnboardingConfig['sections']) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          enabled: !prev.sections[section].enabled
        }
      }
    }))
  }

  const toggleMandatory = (section: keyof typeof AVAILABLE_FIELDS, field: string) => {
    setConfig(prev => {
      const sec = prev.sections[section as keyof typeof AVAILABLE_FIELDS] as any
      const fields = sec.mandatoryFields || []
      const isReq = fields.includes(field)
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [section]: {
            ...sec,
            mandatoryFields: isReq ? fields.filter((f: string) => f !== field) : [...fields, field]
          }
        }
      }
    })
  }

  const addCustomField = () => {
    if (!newCustomField.label || !newCustomField.id) return
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        otherDetails: {
          ...prev.sections.otherDetails,
          customFields: [...(prev.sections.otherDetails.customFields || []), { ...newCustomField }]
        }
      }
    }))
    setNewCustomField({ id: '', label: '', type: 'text', required: false })
  }

  const removeCustomField = (index: number) => {
    setConfig(prev => {
      const fields = [...(prev.sections.otherDetails.customFields || [])]
      fields.splice(index, 1)
      return {
        ...prev,
        sections: {
          ...prev.sections,
          otherDetails: {
            ...prev.sections.otherDetails,
            customFields: fields
          }
        }
      }
    })
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Settings</h1>
          <p className="text-sm text-gray-500">Configure the Student Onboarding form fields and mandatory requirements.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Iterate over static config sections */}
        {Object.entries(AVAILABLE_FIELDS).map(([sectionKey, fields]) => {
          const sectionConfig = config.sections[sectionKey as keyof typeof AVAILABLE_FIELDS] as any
          return (
            <div key={sectionKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between bg-gray-50/80 border-b border-gray-200 cursor-pointer" onClick={() => toggleSection(sectionKey as any)}>
                <h3 className="text-lg font-medium text-gray-900 capitalize text-left">
                  {sectionKey.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="flex items-center">
                  <span className={`mr-3 text-sm font-medium ${sectionConfig.enabled ? 'text-teal-600' : 'text-gray-400'}`}>
                    {sectionConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                      sectionConfig.enabled ? 'bg-teal-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        sectionConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {sectionConfig.enabled && (
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-4">Select the fields that should be mandatory for admission:</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {fields.map(field => {
                      const isMandatory = sectionConfig.mandatoryFields?.includes(field.name)
                      return (
                        <label key={field.name} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${isMandatory ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <div className="flex h-5 items-center">
                            <input
                              type="checkbox"
                              checked={isMandatory}
                              onChange={() => toggleMandatory(sectionKey as any, field.name)}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <span className={`font-medium ${isMandatory ? 'text-teal-900' : 'text-gray-700'}`}>{field.label}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Custom Fields Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="px-6 py-4 flex items-center justify-between bg-gray-50/80 border-b border-gray-200 cursor-pointer" onClick={() => toggleSection('otherDetails')}>
            <h3 className="text-lg font-medium text-gray-900">Custom Fields (Other Details)</h3>
              <div className="flex items-center">
                <span className={`mr-3 text-sm font-medium ${config.sections.otherDetails.enabled ? 'text-teal-600' : 'text-gray-400'}`}>
                  {config.sections.otherDetails.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                    config.sections.otherDetails.enabled ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      config.sections.otherDetails.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
          </div>

          {config.sections.otherDetails.enabled && (
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">Add dynamic fields that are not part of the standard form. These will be stored as JSON data.</p>
              
              <div className="space-y-4 mb-8">
                {config.sections.otherDetails.customFields && config.sections.otherDetails.customFields.map((cf, idx) => (
                  <div key={idx} className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50/50">
                    <div className="w-1/3">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Label</p>
                      <p className="font-medium text-gray-900">{cf.label}</p>
                    </div>
                    <div className="w-1/4">
                      <p className="text-xs text-gray-500 uppercase font-semibold">ID</p>
                      <p className="text-sm text-gray-600 font-mono">{cf.id}</p>
                    </div>
                    <div className="w-1/4">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Type</p>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {cf.type}
                      </span>
                    </div>
                    <div className="w-auto flex-1 text-right">
                       <span className={`text-xs font-medium ${cf.required ? 'text-red-600' : 'text-green-600'}`}>
                          {cf.required ? '* Required' : 'Optional'}
                       </span>
                    </div>
                    <button onClick={() => removeCustomField(idx)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                       <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {(!config.sections.otherDetails.customFields || config.sections.otherDetails.customFields.length === 0) && (
                   <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
                     No custom fields added yet.
                   </div>
                )}
              </div>

              <div className="bg-white border rounded-lg p-5">
                 <h4 className="text-sm font-semibold text-gray-900 mb-4">Add New Field</h4>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Field Label</label>
                      <input 
                        type="text" 
                        value={newCustomField.label}
                        onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })}
                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" 
                        placeholder="E.g. Bus Route Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Field JSON Key</label>
                      <input 
                        type="text" 
                        value={newCustomField.id}
                        onChange={(e) => setNewCustomField({ ...newCustomField, id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md text-sm font-mono text-gray-600 focus:ring-teal-500 focus:border-teal-500" 
                        placeholder="bus_route"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Input Type</label>
                      <select 
                         value={newCustomField.type}
                         onChange={(e) => setNewCustomField({ ...newCustomField, type: e.target.value })}
                         className="w-full px-3 py-2 border rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                      >
                         <option value="text">Text (String)</option>
                         <option value="number">Number</option>
                         <option value="boolean">Checkbox (Yes/No)</option>
                      </select>
                    </div>
                    <div>
                       <div className="flex items-center h-9 mb-2 space-x-2">
                          <input 
                            type="checkbox" 
                            checked={newCustomField.required}
                            onChange={(e) => setNewCustomField({ ...newCustomField, required: e.target.checked })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" 
                          />
                          <label className="text-sm text-gray-700">Required</label>
                       </div>
                    </div>
                 </div>
                 <div className="mt-4 flex justify-end">
                    <button 
                      onClick={addCustomField}
                      disabled={!newCustomField.label || !newCustomField.id}
                      className="flex items-center space-x-1 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                    >
                       <Plus className="w-4 h-4" />
                       <span>Add Field</span>
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
