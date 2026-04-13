import type { OnboardStaffInput } from '../../../../lib/queries/org-users'
import type { CustomField } from '../../../../lib/queries/students'

interface Props {
  data: Partial<OnboardStaffInput>
  updateData: (data: Partial<OnboardStaffInput>) => void
  config: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
}

export default function StaffAddress({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)
  const inputCls = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-shadow"

  if (!config.enabled) return null

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Address Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address {isReq('address') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('address')}
            value={data.address || ''}
            onChange={(e) => updateData({ address: e.target.value })}
            className={inputCls}
            placeholder="123 Main Street"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City {isReq('city') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('city')}
            value={data.city || ''}
            onChange={(e) => updateData({ city: e.target.value })}
            className={inputCls}
            placeholder="New York"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State {isReq('state') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('state')}
            value={data.state || ''}
            onChange={(e) => updateData({ state: e.target.value })}
            className={inputCls}
            placeholder="NY"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP / Postal Code
          </label>
          <input
            type="text"
            value={data.zipCode || ''}
            onChange={(e) => updateData({ zipCode: e.target.value })}
            className={inputCls}
            placeholder="10001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            value={data.country || 'India'}
            onChange={(e) => updateData({ country: e.target.value })}
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
                updateData({ customData: { ...customData, [field.id]: value } } as any)
              }

              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.placeholder && <p className="text-xs text-gray-500 mb-1">{field.placeholder}</p>}
                  {field.type === 'text' && (
                    <input type="text" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'textarea' && (
                    <textarea required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                  )}
                  {field.type === 'select' && (
                    <select required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls}>
                      <option value="">Select</option>
                      {field.options?.map((opt, idx) => (<option key={idx} value={opt}>{opt}</option>))}
                    </select>
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
