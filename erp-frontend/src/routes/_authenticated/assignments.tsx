import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Calendar, Tag } from 'lucide-react'
import { useState } from 'react'
import { fetchAssignments, createAssignment } from '../../lib/queries/assignments'
import { fetchMyClasses } from '../../lib/queries/teacher'
import { fetchMyStudent } from '../../lib/queries/students'
import type { Assignment } from '../../lib/queries/assignments'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/assignments')({
  component: AssignmentsPage,
})

function AssignmentsPage() {
  const { myPermissions, myRoles } = Route.useRouteContext()
  const perms = myPermissions as string[]
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')
  const canManage = perms.includes('assignments.manage')

  const [selectedClass, setSelectedClass] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formClass, setFormClass] = useState('')
  const [subject, setSubject] = useState('')
  const [dueDate, setDueDate] = useState('')

  const queryClient = useQueryClient()

  const { data: myStudent } = useQuery({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
    enabled: isStudent,
  })

  const { data: classes = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
    enabled: !isStudent,
  })

  const classFilter = isStudent ? myStudent?.className : (selectedClass || undefined)

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments', classFilter],
    queryFn: () => fetchAssignments(classFilter),
    enabled: !isStudent || !!myStudent?.className,
  })

  const createMutation = useMutation({
    mutationFn: () => createAssignment(title, description, formClass, subject || undefined, dueDate || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      setShowForm(false)
      setTitle('')
      setDescription('')
      setFormClass('')
      setSubject('')
      setDueDate('')
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isStudent
              ? `Assignments for Class ${myStudent?.className || ''}`
              : 'Manage homework and classwork for your classes'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        )}
      </div>

      {/* Create Form (teachers/admins only) */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={formClass}
              onChange={e => setFormClass(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Class *</option>
              {classes.map(c => (
                <option key={c.id} value={c.className}>{c.className}</option>
              ))}
            </select>
            <input
              placeholder="Subject (optional)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title || !formClass || createMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Class Filter (teachers/admins only) */}
      {!isStudent && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedClass('')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              selectedClass === '' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            All Classes
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
            </button>
          ))}
        </div>
      )}

      {/* Assignments List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800">{a.title}</h3>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                  {a.className}
                </span>
              </div>
              {a.description && (
                <p className="text-sm text-gray-600 mb-3">{a.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {a.subject && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {a.subject}
                  </span>
                )}
                {a.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {a.dueDate}
                  </span>
                )}
                <span>By {a.assignedByName}</span>
                <span>{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
