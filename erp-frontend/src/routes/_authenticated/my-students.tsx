import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { fetchMyClasses, fetchMyStudents } from '../../lib/queries/teacher'
import type { TeacherClass, StudentProgress } from '../../lib/queries/teacher'

export const Route = createFileRoute('/_authenticated/my-students')({
  component: MyStudentsPage,
})

function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

function MyStudentsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('')

  const { data: classes = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
  })

  const { data: students = [], isLoading } = useQuery<StudentProgress[]>({
    queryKey: ['myStudents', selectedClass],
    queryFn: () => fetchMyStudents(selectedClass || undefined),
  })

  const rateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-50'
    if (rate >= 75) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  const rateBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 75) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Students</h1>
        <p className="text-sm text-gray-500 mt-1">View student progress across your classes</p>
      </div>

      {/* Class Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedClass('')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            selectedClass === '' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          All Classes ({students.length})
        </button>
        {classes.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedClass(c.className)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              selectedClass === c.className ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {c.className}
            {c.isClassTeacher && <span className="ml-1 text-[10px] text-teal-500">(CT)</span>}
          </button>
        ))}
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No students found in your assigned classes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Attendance</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Fees Paid</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Fees Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="font-medium text-gray-700 hover:text-teal-600 transition-colors"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                      {s.className}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rateBarColor(s.attendanceRate)}`}
                          style={{ width: `${Math.min(s.attendanceRate, 100)}%` }}
                        />
                      </div>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${rateColor(s.attendanceRate)}`}>
                        {s.attendanceRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({s.attendancePresent}/{s.attendanceTotal})
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-right">{formatPaise(s.feesPaid)}</td>
                  <td className="px-5 py-3 text-right">
                    {s.feesPending > 0 ? (
                      <span className="text-red-600 font-medium">{formatPaise(s.feesPending)}</span>
                    ) : (
                      <span className="text-green-600">{formatPaise(0)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {students.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>
            Avg attendance: {(students.reduce((s, st) => s + st.attendanceRate, 0) / students.length).toFixed(1)}%
          </span>
          <span>
            Total pending fees: {formatPaise(students.reduce((s, st) => s + st.feesPending, 0))}
          </span>
        </div>
      )}
    </div>
  )
}
