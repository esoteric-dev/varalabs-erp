import { AddStudentInput } from '../../../../lib/queries/students'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function AddressInfo({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Address Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
        {/* Current Address */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Address</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address {isReq('currentAddress') && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={isReq('currentAddress')}
              value={data.currentAddress || ''}
              onChange={(e) => updateData({ currentAddress: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City {isReq('currentCity') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('currentCity')}
                value={data.currentCity || ''}
                onChange={(e) => updateData({ currentCity: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State {isReq('currentState') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('currentState')}
                value={data.currentState || ''}
                onChange={(e) => updateData({ currentState: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code {isReq('currentZipCode') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('currentZipCode')}
                value={data.currentZipCode || ''}
                onChange={(e) => updateData({ currentZipCode: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country {isReq('currentCountry') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('currentCountry')}
                value={data.currentCountry || ''}
                onChange={(e) => updateData({ currentCountry: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Permanent Address */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Permanent Address</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address {isReq('permanentAddress') && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={isReq('permanentAddress')}
              value={data.permanentAddress || ''}
              onChange={(e) => updateData({ permanentAddress: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City {isReq('permanentCity') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('permanentCity')}
                value={data.permanentCity || ''}
                onChange={(e) => updateData({ permanentCity: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State {isReq('permanentState') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('permanentState')}
                value={data.permanentState || ''}
                onChange={(e) => updateData({ permanentState: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code {isReq('permanentZipCode') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('permanentZipCode')}
                value={data.permanentZipCode || ''}
                onChange={(e) => updateData({ permanentZipCode: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country {isReq('permanentCountry') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isReq('permanentCountry')}
                value={data.permanentCountry || ''}
                onChange={(e) => updateData({ permanentCountry: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
