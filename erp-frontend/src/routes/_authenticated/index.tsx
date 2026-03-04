import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboard } from '../../components/dashboard/admin'
import { SuperAdminDashboard } from '../../components/dashboard/superadmin'
import { TeacherDashboard } from '../../components/dashboard/teacher'
import { StudentDashboard } from '../../components/dashboard/student'
import { ParentDashboard } from '../../components/dashboard/parent'
import { GeneralRoleDashboard } from '../../components/dashboard/general-role'
import { TenantAdminDashboard } from '../../components/dashboard/tenant-admin'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard,
})

function Dashboard() {
  const { orgSlug, currentUser, myRoles } = Route.useRouteContext()

  // Tenant admin on root domain (no org slug) → tenant admin dashboard
  if (!orgSlug && currentUser.systemRole === 'tenant_admin') {
    return <TenantAdminDashboard />
  }

  // System-level roles
  if (currentUser.systemRole === 'superadmin') return <SuperAdminDashboard tenantId={orgSlug || ''} />
  if (currentUser.systemRole === 'tenant_admin') return <AdminDashboard tenantId={orgSlug || ''} />

  // Dynamic org-level roles
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  if (slugs.includes('admin')) return <AdminDashboard tenantId={orgSlug || ''} />
  if (slugs.includes('teacher')) return <TeacherDashboard tenantId={orgSlug || ''} />
  if (slugs.includes('student')) return <StudentDashboard tenantId={orgSlug || ''} />
  if (slugs.includes('parent')) return <ParentDashboard tenantId={orgSlug || ''} />

  return <GeneralRoleDashboard tenantId={orgSlug || ''} />
}
