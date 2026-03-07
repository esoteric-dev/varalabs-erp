import { Award, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchBestPerformers } from '../../../lib/queries/dashboard-v2'

export function BestPerformers() {
  const { data: performers = [] } = useQuery({
    queryKey: ['bestPerformers'],
    queryFn: fetchBestPerformers,
    staleTime: 5 * 60_000,
  })

  const teacher = performers.find(p => p.role === 'teacher')
  const student = performers.find(p => p.role === 'student')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Best Performers</h3>
      <div className="space-y-3">
        <div className="relative overflow-hidden flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/30 rounded-full -translate-y-6 translate-x-6" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Award className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {teacher?.name || 'Best Teacher'}
            </p>
            <p className="text-xs text-gray-500">
              {teacher ? teacher.metricLabel : 'Top performer this month'}
            </p>
          </div>
          {teacher && (
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full relative z-10">
              {teacher.metricValue}
            </span>
          )}
          {!teacher && <span className="ml-auto text-lg relative z-10">&#11088;</span>}
        </div>
        <div className="relative overflow-hidden flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/30 rounded-full -translate-y-6 translate-x-6" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white shadow-md">
            <Star className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {student?.name || 'Star Student'}
            </p>
            <p className="text-xs text-gray-500">
              {student ? `${student.className || ''} - ${student.metricLabel}` : 'Top achiever this month'}
            </p>
          </div>
          {student && (
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full relative z-10">
              {student.metricValue}
            </span>
          )}
          {!student && <span className="ml-auto text-lg relative z-10">&#11088;</span>}
        </div>
      </div>
    </div>
  )
}
