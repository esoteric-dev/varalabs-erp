import type { OnboardStaffInput } from '../../../../lib/queries/org-users'
import type { CustomField } from '../../../../lib/queries/students'

interface Props {
  data: Partial<OnboardStaffInput>
  updateData: (data: Partial<OnboardStaffInput>) => void
  config: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
  loginEmailPreview?: string
  loadingPreview?: boolean
}

export default function StaffPersonalInfo({ data, updateData, config, loginEmailPreview, loadingPreview }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)
  const inputCls = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-shadow"

  if (!config.enabled) return null

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name {isReq('name') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('name')}
            value={data.name || ''}
            onChange={(e) => updateData({ name: e.target.value })}
            className={inputCls}
            placeholder="Enter full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Login Email
          </label>
          <div className={`w-full px-4 py-2 rounded-lg text-sm ${loadingPreview ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-700'} border border-gray-200`}>
            {loadingPreview ? 'Generating...' : (loginEmailPreview || 'Auto-generated')}
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-generated from name</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personal Email
          </label>
          <input
            type="email"
            value={data.personalEmail || ''}
            onChange={(e) => updateData({ personalEmail: e.target.value })}
            className={inputCls}
            placeholder="personal@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number {isReq('phone') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateData({ phone: e.target.value })}
            className={inputCls}
            placeholder="+1 234 567 8900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Designation {isReq('designation') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={data.designation || ''}
            onChange={(e) => updateData({ designation: e.target.value })}
            className={inputCls}
            placeholder="e.g., Senior Teacher"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            value={data.department || ''}
            onChange={(e) => updateData({ department: e.target.value })}
            className={inputCls}
            placeholder="e.g., Mathematics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Qualification
          </label>
          <input
            type="text"
            value={data.qualification || ''}
            onChange={(e) => updateData({ qualification: e.target.value })}
            className={inputCls}
            placeholder="e.g., M.Ed, PhD"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender {isReq('gender') && <span className="text-red-500">*</span>}
          </label>
          <select
            value={data.gender || ''}
            onChange={(e) => updateData({ gender: e.target.value })}
            className={inputCls}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth {isReq('dateOfBirth') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            value={data.dateOfBirth || ''}
            onChange={(e) => updateData({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blood Group
          </label>
          <select
            value={data.bloodGroup || ''}
            onChange={(e) => updateData({ bloodGroup: e.target.value })}
            className={inputCls}
          >
            <option value="">Select blood group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marital Status
          </label>
          <select
            value={data.maritalStatus || ''}
            onChange={(e) => updateData({ maritalStatus: e.target.value })}
            className={inputCls}
          >
            <option value="">Select marital status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Joining {isReq('dateOfJoining') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            value={data.dateOfJoining || ''}
            onChange={(e) => updateData({ dateOfJoining: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Custom Fields */}
        {config.customFields && config.customFields.length > 0 && (
          <>
            <div className="col-span-full border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h4>
            </div>
            {config.customFields.map((field) => {
              const customData = (data as any).customData || {}
              const handleCustomChange = (value: any) => {
                updateData({
                  customData: {
                    ...customData,
                    [field.id]: value
                  }
                } as any)
              }

              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.placeholder && <p className="text-xs text-gray-500 mb-1">{field.placeholder}</p>}
                  
                  {field.type === 'text' && (
                    <input type="text" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} placeholder={field.placeholder} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(parseFloat(e.target.value) || 0)} className={inputCls} />
                  )}
                  {field.type === 'email' && (
                    <input type="email" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'phone' && (
                    <input type="tel" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'date' && (
                    <input type="date" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'textarea' && (
                    <textarea required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder={field.placeholder} />
                  )}
                  {field.type === 'select' && (
                    <select required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls}>
                      <option value="">Select an option</option>
                      {field.options?.map((option, idx) => (<option key={idx} value={option}>{option}</option>))}
                    </select>
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center h-10">
                      <input type="checkbox" required={field.required} checked={customData[field.id] || false} onChange={(e) => handleCustomChange(e.target.checked)} className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </div>
                  )}
                  {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
