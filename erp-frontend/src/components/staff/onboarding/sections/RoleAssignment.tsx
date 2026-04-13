import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { fetchRoles, assignRoleToUser } from '../../../../lib/queries/roles'
import { assignClassToTeacher } from '../../../../lib/queries/teacher'
import { fetchClasses } from '../../../../lib/queries/dashboard'

interface Props {
  userId: string
  organisationId: string
  onRoleAssigned?: (roleId: string) => void
  onClassAssigned?: (className: string, isClassTeacher: boolean) => void
}

export default function RoleAssignment({ userId, organisationId, onRoleAssigned, onClassAssigned }: Props) {
  const qc = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [showClassAssignment, setShowClassAssignment] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [classError, setClassError] = useState<string | null>(null)

  // Fetch roles for this organisation
  const { data: roles = [] } = useQuery({
    queryKey: ['orgRoles', organisationId],
    queryFn: () => fetchRoles(organisationId),
    staleTime: 5 * 60_000,
  })

  // Fetch classes if teacher role is selected
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    enabled: showClassAssignment,
    staleTime: 5 * 60_000,
  })

  // Assign role mutation - calls backend
  const assignRoleMutation = useMutation({
    mutationFn: async ({ roleId, organisationId, userId }: { roleId: string; organisationId: string; userId: string }) => {
      return await assignRoleToUser(userId, organisationId, roleId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgRoles'] })
      qc.invalidateQueries({ queryKey: ['myRoles'] })
      qc.invalidateQueries({ queryKey: ['myPermissions'] })
      qc.invalidateQueries({ queryKey: ['orgUsers'] })
      setRoleError(null)
      if (onRoleAssigned && selectedRole) {
        onRoleAssigned(selectedRole)
      }
    },
    onError: (err: any) => {
      setRoleError(err.message || 'Failed to assign role')
    },
  })

  // Assign class to teacher mutation - calls backend
  const assignClassMutation = useMutation({
    mutationFn: async ({ className, isClassTeacher }: { className: string; isClassTeacher: boolean }) => {
      return await assignClassToTeacher(userId, className, isClassTeacher)
    },
    onSuccess: (_, { className, isClassTeacher }) => {
      qc.invalidateQueries({ queryKey: ['myClasses'] })
      qc.invalidateQueries({ queryKey: ['myStudents'] })
      qc.invalidateQueries({ queryKey: ['orgUsers'] })
      setClassError(null)
      if (onClassAssigned) {
        onClassAssigned(className, isClassTeacher)
      }
    },
    onError: (err: any) => {
      setClassError(err.message || 'Failed to assign class')
    },
  })

  const handleRoleAssign = () => {
    if (!selectedRole || !userId || !organisationId) return
    setRoleError(null)
    assignRoleMutation.mutate({ roleId: selectedRole, organisationId, userId })
  }

  const handleClassAssign = () => {
    if (!selectedClass || !userId) return
    setClassError(null)
    assignClassMutation.mutate({
      className: selectedClass,
      isClassTeacher,
    })
  }

  // Check if selected role is teacher
  const selectedRoleData = (roles as any[]).find((r: any) => r.id === selectedRole)
  const isTeacherRole = selectedRoleData?.slug === 'teacher' || selectedRoleData?.name.toLowerCase().includes('teacher')

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Role & Class Assignment</h3>
      
      {/* Role Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value)
              setShowClassAssignment(isTeacherRole || ((roles as any[]).find((r: any) => r.id === e.target.value)?.slug === 'teacher'))
            }}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            <option value="">Select a role</option>
            {((roles as any[]).map((role: any) => (
              <option key={role.id} value={role.id}>
                {role.name} {role.isSystem && '(System)'}
              </option>
            )))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This role determines the user's permissions and access level
          </p>
          {roleError && (
            <p className="text-xs text-red-600 mt-1">{roleError}</p>
          )}
        </div>

        <div className="flex items-end">
          <button
            onClick={handleRoleAssign}
            disabled={!selectedRole || !userId || assignRoleMutation.isPending}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
          </button>
        </div>
      </div>

      {/* Class Teacher Assignment - Only shown when Teacher role is selected */}
      {isTeacherRole && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Class Teacher Assignment
          </h4>
          <p className="text-xs text-blue-700 mb-4">
            Assign this teacher to a class. You can also make them a Class Teacher (Homeroom Teacher) for additional responsibilities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select class</option>
                {((classes as string[]).map((cls: string) => (
                  <option key={cls} value={cls}>{cls}</option>
                )))}
              </select>
              {classError && (
                <p className="text-xs text-red-600 mt-1">{classError}</p>
              )}
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isClassTeacher}
                  onChange={(e) => setIsClassTeacher(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-900">Class Teacher</span>
              </label>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClassAssign}
                disabled={!selectedClass || !userId || assignClassMutation.isPending}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {assignClassMutation.isPending ? 'Assigning...' : 'Assign Class'}
              </button>
            </div>
          </div>

          {((classes as string[]).length === 0) && (
            <p className="text-xs text-blue-600 mt-2">
              No classes found. Please create classes first in Settings.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
