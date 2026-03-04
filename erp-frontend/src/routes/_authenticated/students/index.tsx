import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { fetchStudents, createStudent } from '../../../lib/queries/students'
import type { Student } from '../../../lib/queries/students'

export const Route = createFileRoute('/_authenticated/students/')({
  component: StudentDirectory,
})

function StudentDirectory() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newClassName, setNewClassName] = useState('')

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: fetchStudents,
  })

  const mutation = useMutation({
    mutationFn: ({ name, className }: { name: string; className: string }) =>
      createStudent(name, className),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setShowForm(false)
      setNewName('')
      setNewClassName('')
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Directory</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage and view all enrolled students</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Add Student Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Add New Student</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({ name: newName, className: newClassName })
            }}
            className="flex items-end gap-3"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Student name"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. 10-A"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </form>
          {mutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(mutation.error as Error).message || 'Failed to create student'}
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search students..."
            className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : students.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No students found</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-800 hover:text-teal-600 transition-colors">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.className}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="text-xs text-teal-600 hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
