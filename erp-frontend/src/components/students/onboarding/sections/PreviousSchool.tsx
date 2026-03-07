import { AddStudentInput } from '../../../../lib/queries/students'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function PreviousSchool({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Previous School Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Previous School Name {isReq('previousSchoolName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('previousSchoolName')}
            value={data.previousSchoolName || ''}
            onChange={(e) => updateData({ previousSchoolName: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School Address {isReq('previousSchoolAddress') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('previousSchoolAddress')}
            value={data.previousSchoolAddress || ''}
            onChange={(e) => updateData({ previousSchoolAddress: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  )
}
