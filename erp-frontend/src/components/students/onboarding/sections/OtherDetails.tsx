import type { AddStudentInput } from '../../../../lib/queries/students'

interface CustomField {
  id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
}

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: {
    enabled: boolean;
    customFields?: CustomField[]
  }
}

export default function OtherDetails({ data, updateData, config }: Props) {
  const customData = data.customData || {}

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    updateData({
      customData: {
        ...customData,
        [fieldId]: value
      }
    })
  }

  if (!config.customFields || config.customFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Custom Fields</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {config.customFields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.placeholder && (
              <p className="text-xs text-gray-500 mb-1">{field.placeholder}</p>
            )}

            {/* Text Input */}
            {field.type === 'text' && (
              <input
                type="text"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {/* Number Input */}
            {field.type === 'number' && (
              <input
                type="number"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {/* Email Input */}
            {field.type === 'email' && (
              <input
                type="email"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {/* Phone Input */}
            {field.type === 'phone' && (
              <input
                type="tel"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {/* Date Input */}
            {field.type === 'date' && (
              <input
                type="date"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {/* Textarea */}
            {field.type === 'textarea' && (
              <textarea
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
              />
            )}

            {/* Select Dropdown */}
            {field.type === 'select' && (
              <select
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              >
                <option value="">Select an option</option>
                {(field as any).options?.map((option: string, idx: number) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            )}

            {/* Multi-Select */}
            {field.type === 'multiselect' && (
              <div className="space-y-2">
                {(field as any).options?.map((option: string, idx: number) => {
                  const selected = (customData[field.id] || []) as string[]
                  const isSelected = selected.includes(option)
                  return (
                    <label key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = e.target.checked
                            ? [...selected, option]
                            : selected.filter((s: string) => s !== option)
                          handleCustomFieldChange(field.id, newSelected)
                        }}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* Checkbox */}
            {field.type === 'checkbox' && (
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  required={field.required}
                  checked={customData[field.id] || false}
                  onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </div>
            )}

            {/* Help Text */}
            {(field as any).helpText && (
              <p className="text-xs text-gray-500 mt-1">{(field as any).helpText}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
