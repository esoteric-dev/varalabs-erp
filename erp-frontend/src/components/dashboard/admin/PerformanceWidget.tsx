import { useState } from 'react'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { WidgetHeader } from './WidgetHeader'
import { fetchClassPerformance } from '../../../lib/queries/dashboard-v2'

export function PerformanceWidget() {
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined)

  const { data: performance } = useQuery({
    queryKey: ['classPerformance', selectedClass],
    queryFn: () => fetchClassPerformance(selectedClass),
    staleTime: 2 * 60_000,
  })

  const top = performance?.topCount ?? 0
  const average = performance?.averageCount ?? 0
  const belowAvg = performance?.belowAverageCount ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Performance"
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
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{top}</p>
            <p className="text-xs text-emerald-600">Top Performers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white">
            <Minus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{average}</p>
            <p className="text-xs text-amber-600">Average</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{belowAvg}</p>
            <p className="text-xs text-red-600">Below Average</p>
          </div>
        </div>
      </div>
    </div>
  )
}
