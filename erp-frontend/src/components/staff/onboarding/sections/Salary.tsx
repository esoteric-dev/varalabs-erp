import type { OnboardStaffInput } from '../../../../lib/queries/org-users'
import type { CustomField } from '../../../../lib/queries/students'

interface Props {
  data: Partial<OnboardStaffInput>
  updateData: (data: Partial<OnboardStaffInput>) => void
  salary: { basicPay: string; allowances: string; deductions: string }
  updateSalary: (salary: { basicPay: string; allowances: string; deductions: string }) => void
  config: { enabled: boolean; mandatoryFields: string[]; customFields?: CustomField[] }
}

export default function StaffSalary({ data, updateData, salary, updateSalary, config }: Props) {
  const inputCls = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-shadow"

  if (!config.enabled) return null

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Salary Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Basic Pay (per month)
          </label>
          <input
            type="number"
            step="0.01"
            value={salary.basicPay}
            onChange={(e) => updateSalary({ ...salary, basicPay: e.target.value })}
            className={inputCls}
            placeholder="50000.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allowances (per month)
          </label>
          <input
            type="number"
            step="0.01"
            value={salary.allowances}
            onChange={(e) => updateSalary({ ...salary, allowances: e.target.value })}
            className={inputCls}
            placeholder="10000.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deductions (per month)
          </label>
          <input
            type="number"
            step="0.01"
            value={salary.deductions}
            onChange={(e) => updateSalary({ ...salary, deductions: e.target.value })}
            className={inputCls}
            placeholder="5000.00"
          />
        </div>

        {salary.basicPay && (
          <div className="md:col-span-2 lg:col-span-3 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h4 className="text-sm font-semibold text-teal-900 mb-2">Salary Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-teal-600">Gross: ₹{(parseFloat(salary.basicPay || '0') + parseFloat(salary.allowances || '0')).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-teal-600">Deductions: ₹{parseFloat(salary.deductions || '0').toFixed(2)}</p>
              </div>
              <div>
                <p className="text-teal-700 font-bold">Net: ₹{(parseFloat(salary.basicPay || '0') + parseFloat(salary.allowances || '0') - parseFloat(salary.deductions || '0')).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {config.customFields && config.customFields.length > 0 && (
          <>
            <div className="col-span-full border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h4>
            </div>
            {config.customFields.map((field) => {
              const staffCustomData = (data as any).customData || {}
              const handleCustomChange = (value: any) => {
                updateData({ customData: { ...staffCustomData, [field.id]: value } } as any)
              }

              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input type="text" required={field.required} value={staffCustomData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" required={field.required} value={staffCustomData[field.id] || ''} onChange={(e) => handleCustomChange(parseFloat(e.target.value) || 0)} className={inputCls} />
                  )}
                  {field.type === 'select' && (
                    <select required={field.required} value={staffCustomData[field.id] || ''} onChange={(e) => handleCustomChange(e.target.value)} className={inputCls}>
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
