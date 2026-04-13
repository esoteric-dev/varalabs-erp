import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { fetchRoles, fetchAllPermissions, createRole, updateRole, deleteRole } from '../../lib/queries/roles'
import type { RoleWithPermissions } from '../../lib/queries/roles'

function getOrgIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('authToken')
    if (!token) return null
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.org_id || null
  } catch {
    return null
  }
}

export function RolesManager() {
  const queryClient = useQueryClient()
  const orgId = getOrgIdFromToken()

  const [showForm,         setShowForm]         = useState(false)
  const [editingRoleId,    setEditingRoleId]    = useState<string | null>(null)
  const [formName,         setFormName]         = useState('')
  const [formSlug,         setFormSlug]         = useState('')
  const [formDescription,  setFormDescription]  = useState('')
  const [formPermissions,  setFormPermissions]  = useState<string[]>([])

  const { data: permissions = [] } = useQuery({
    queryKey: ['allPermissions'],
    queryFn: fetchAllPermissions,
  })

  const moduleGroups = permissions.reduce(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(p)
      return acc
    },
    {} as Record<string, typeof permissions>,
  )

  const { data: roles = [], isLoading } = useQuery<RoleWithPermissions[]>({
    queryKey: ['roles', orgId],
    queryFn: () => fetchRoles(orgId!),
    enabled: !!orgId,
  })

  const createRoleMutation = useMutation({
    mutationFn: (args: { name: string; slug: string; description?: string; permissionCodes: string[] }) =>
      createRole(orgId!, args.name, args.slug, args.permissionCodes, args.description),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles', orgId] }); resetForm() },
  })

  const updateRoleMutation = useMutation({
    mutationFn: (args: { roleId: string; name?: string; description?: string; permissionCodes?: string[] }) =>
      updateRole(args.roleId, { name: args.name, description: args.description, permissionCodes: args.permissionCodes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles', orgId] }); resetForm() },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles', orgId] }),
  })

  function resetForm() {
    setShowForm(false); setEditingRoleId(null)
    setFormName(''); setFormSlug(''); setFormDescription(''); setFormPermissions([])
  }

  function startEditing(role: RoleWithPermissions) {
    setEditingRoleId(role.id); setFormName(role.name); setFormSlug(role.slug)
    setFormDescription(role.description); setFormPermissions(role.permissions.map(p => p.code))
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingRoleId) {
      updateRoleMutation.mutate({ roleId: editingRoleId, name: formName, description: formDescription, permissionCodes: formPermissions })
    } else {
      createRoleMutation.mutate({ name: formName, slug: formSlug, description: formDescription || undefined, permissionCodes: formPermissions })
    }
  }

  const mutationPending = createRoleMutation.isPending || updateRoleMutation.isPending
  const mutationError   = createRoleMutation.error    || updateRoleMutation.error

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Roles</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage roles and their permissions</p>
        </div>
        {orgId && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Role
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {editingRoleId ? 'Edit Role' : 'Create New Role'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g. Librarian" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
                <input value={formSlug} onChange={e => setFormSlug(e.target.value)} required disabled={!!editingRoleId}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="e.g. librarian" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(moduleGroups).map(([module, perms]) => (
                  <div key={module} className="border border-gray-100 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-700 capitalize mb-2">{module}</h4>
                    {perms.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-gray-600 mb-1 cursor-pointer">
                        <input type="checkbox" checked={formPermissions.includes(p.code)}
                          onChange={e => setFormPermissions(prev =>
                            e.target.checked ? [...prev, p.code] : prev.filter(c => c !== p.code)
                          )}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        {p.code}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={mutationPending}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
                {mutationPending ? 'Saving…' : editingRoleId ? 'Update Role' : 'Create Role'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
            </div>

            {mutationError && (
              <p className="text-xs text-red-600">
                {(mutationError as Error).message || 'Failed to save role'}
              </p>
            )}
          </form>
        </div>
      )}

      {!orgId && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-700">
            Organisation context is required to view roles.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {roles.map(role => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-900">{role.name}</h3>
                  {role.isSystem && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">System</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{role.slug}</span>
                  <button onClick={() => startEditing(role)} className="p-1 text-gray-400 hover:text-teal-600" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => { if (confirm('Delete this role?')) deleteRoleMutation.mutate(role.id) }}
                      className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {role.description && <p className="text-sm text-gray-500 mb-3">{role.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map(perm => (
                  <span key={perm.id} className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600" title={perm.description}>
                    {perm.code}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {roles.length === 0 && !isLoading && orgId && (
            <div className="py-8 text-center text-sm text-gray-400">No roles found</div>
          )}
        </div>
      )}
    </div>
  )
}
