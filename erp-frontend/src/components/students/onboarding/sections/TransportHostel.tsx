import { AddStudentInput } from '../../../../lib/queries/students'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function TransportHostel({ data, updateData, config }: Props) {
  // We do not have explicit fields for this in backend yet, so we could store it in customData if necessary,
  // or it can act as a placeholder. Let's comment this out or leave it empty so we don't break the build.
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Transport & Hostel</h3>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
        Transport and Hostel management will be implemented in a future update.
      </div>
    </div>
  )
}
