import type { AddStudentInput } from '../../../../lib/queries/students'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function ParentsGuardian({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Parents & Guardian Information</h3>
      
      {/* Father */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Name {isReq('fatherName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('fatherName')}
            value={data.fatherName || ''}
            onChange={(e) => updateData({ fatherName: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Phone {isReq('fatherPhone') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            required={isReq('fatherPhone')}
            value={data.fatherPhone || ''}
            onChange={(e) => updateData({ fatherPhone: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Occupation {isReq('fatherOccupation') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('fatherOccupation')}
            value={data.fatherOccupation || ''}
            onChange={(e) => updateData({ fatherOccupation: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Mother */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mother's Name {isReq('motherName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('motherName')}
            value={data.motherName || ''}
            onChange={(e) => updateData({ motherName: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mother's Phone {isReq('motherPhone') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            required={isReq('motherPhone')}
            value={data.motherPhone || ''}
            onChange={(e) => updateData({ motherPhone: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mother's Occupation {isReq('motherOccupation') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('motherOccupation')}
            value={data.motherOccupation || ''}
            onChange={(e) => updateData({ motherOccupation: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Guardian */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guardian's Name {isReq('guardianName') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('guardianName')}
            value={data.guardianName || ''}
            onChange={(e) => updateData({ guardianName: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relation {isReq('guardianRelation') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('guardianRelation')}
            value={data.guardianRelation || ''}
            onChange={(e) => updateData({ guardianRelation: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guardian's Phone {isReq('guardianPhone') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            required={isReq('guardianPhone')}
            value={data.guardianPhone || ''}
            onChange={(e) => updateData({ guardianPhone: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guardian's Email {isReq('guardianEmail') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            required={isReq('guardianEmail')}
            value={data.guardianEmail || ''}
            onChange={(e) => updateData({ guardianEmail: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  )
}
