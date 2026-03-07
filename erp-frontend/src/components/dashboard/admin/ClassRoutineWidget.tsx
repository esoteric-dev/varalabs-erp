import { Plus, Clock, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WidgetHeader } from './WidgetHeader'
import { fetchClassRoutines, deleteClassRoutine } from '../../../lib/queries/dashboard-v2'

export function ClassRoutineWidget() {
  const qc = useQueryClient()
  const { data: routines = [] } = useQuery({
    queryKey: ['classRoutines'],
    queryFn: () => fetchClassRoutines(),
    staleTime: 5 * 60_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClassRoutine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classRoutines'] }),
  })

  const dayLabel = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1, 3)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Class Routine"
        rightContent={
          <button className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add New
          </button>
        }
      />
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {routines.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No class routines configured</p>
        ) : (
          routines.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/60 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {r.teacherName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {r.subjectName || r.className} - {r.teacherName}
                </p>
                <p className="text-xs text-gray-400">
                  {dayLabel(r.dayOfWeek)} {r.section ? `| Sec ${r.section}` : ''} {r.room ? `| Room ${r.room}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {r.startTime} - {r.endTime}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
