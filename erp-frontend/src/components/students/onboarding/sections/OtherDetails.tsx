import { AddStudentInput } from '../../../../lib/queries/students'

interface CustomField {
  id: string
  label: string
  type: string
  required: boolean
}

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { 
    enabled: boolean; 
    customFields: CustomField[] 
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
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Other Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {config.customFields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'text' && (
              <input
                type="text"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                required={field.required}
                value={customData[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, parseInt(e.target.value, 10))}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  required={field.required}
                  checked={customData[field.id] || false}
                  onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Yes / Enabled</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
