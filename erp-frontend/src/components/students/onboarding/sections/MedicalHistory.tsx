import { AddStudentInput } from '../../../../lib/queries/students'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function MedicalHistory({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Medical History</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allergies {isReq('allergies') && <span className="text-red-500">*</span>}
          </label>
          <textarea
            required={isReq('allergies')}
            value={data.allergies || ''}
            onChange={(e) => updateData({ allergies: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="List any known allergies..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Medications {isReq('medications') && <span className="text-red-500">*</span>}
          </label>
          <textarea
            required={isReq('medications')}
            value={data.medications || ''}
            onChange={(e) => updateData({ medications: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="List any current medications..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Past Medical Conditions {isReq('pastConditions') && <span className="text-red-500">*</span>}
          </label>
          <textarea
            required={isReq('pastConditions')}
            value={data.pastConditions || ''}
            onChange={(e) => updateData({ pastConditions: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="List any significant past medical conditions..."
          />
        </div>
      </div>
    </div>
  )
}
