import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { WidgetHeader } from './WidgetHeader'
import { fetchTopSubjects } from '../../../lib/queries/dashboard-v2'

const PROGRESS_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
]

export function TopSubjectsWidget() {
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined)

  const { data: subjects = [] } = useQuery({
    queryKey: ['topSubjects', selectedClass],
    queryFn: () => fetchTopSubjects(selectedClass),
    staleTime: 5 * 60_000,
  })

  // Compute relative progress: max student count = 100%
  const maxCount = Math.max(...subjects.map(s => s.studentCount), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Top Subjects"
        rightContent={
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || undefined)}
            className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Classes</option>
            <option value="I">Class I</option>
            <option value="II">Class II</option>
            <option value="III">Class III</option>
            <option value="IV">Class IV</option>
          </select>
        }
      />
      <p className="text-xs text-gray-400 mb-4">Subjects by student enrollment</p>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {subjects.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No subjects found</p>
        ) : (
          subjects.slice(0, 7).map((s, i) => {
            const progress = Math.round((s.studentCount / maxCount) * 100)
            return (
              <div key={`${s.subjectName}-${i}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{s.subjectName}</span>
                  <span className="text-xs text-gray-400">{s.studentCount} students</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${PROGRESS_COLORS[i % PROGRESS_COLORS.length]} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
