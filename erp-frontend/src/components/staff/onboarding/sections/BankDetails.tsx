import type { OnboardStaffInput } from '../../../../lib/queries/org-users'
import type { CustomField } from '../../../../lib/queries/students'

interface Props {
  data: Partial<OnboardStaffInput>
  updateData: (data: Partial<OnboardStaffInput>) => void
  config: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
}

export default function StaffBankDetails({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)
  const inputCls = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-shadow"

  if (!config.enabled) return null

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Bank Account Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Holder Name {isReq('bankAccountName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('bankAccountName')}
            value={data.bankAccountName || ''}
            onChange={(e) => updateData({ bankAccountName: e.target.value })}
            className={inputCls}
            placeholder="Full name as per bank account"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number {isReq('bankAccountNumber') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('bankAccountNumber')}
            value={data.bankAccountNumber || ''}
            onChange={(e) => updateData({ bankAccountNumber: e.target.value })}
            className={inputCls}
            placeholder="1234567890"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name {isReq('bankName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('bankName')}
            value={data.bankName || ''}
            onChange={(e) => updateData({ bankName: e.target.value })}
            className={inputCls}
            placeholder="State Bank of India"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC / Routing Code
          </label>
          <input
            type="text"
            value={data.bankIfsc || ''}
            onChange={(e) => updateData({ bankIfsc: e.target.value })}
            className={inputCls}
            placeholder="SBIN0001234"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch Name
          </label>
          <input
            type="text"
            value={data.bankBranch || ''}
            onChange={(e) => updateData({ bankBranch: e.target.value })}
            className={inputCls}
            placeholder="Main Branch"
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
                  {field.type === 'text' && (
                    <input type="text" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" required={field.required} value={customData[field.id] || ''} onChange={(e) => handleCustomChange(parseFloat(e.target.value) || 0)} className={inputCls} />
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
