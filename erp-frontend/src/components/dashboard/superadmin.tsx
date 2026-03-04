import {
  Building2, Users, Server, Shield,
  ArrowUpRight, ArrowDownRight, Activity, Globe,
} from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { ProfileCard } from './common/profile-card'
import { MenuCard } from './common/menu-card'

const systemMetrics = [
  { label: 'Active Tenants', value: '24', change: '+3', up: true, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  { label: 'Total Users', value: '12,480', change: '+340', up: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', iconColor: 'text-blue-500' },
  { label: 'System Uptime', value: '99.97%', change: '+0.02%', up: true, icon: Server, color: 'text-green-600', bg: 'bg-green-50', iconColor: 'text-green-500' },
  { label: 'API Requests (24h)', value: '1.2M', change: '+18%', up: true, icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', iconColor: 'text-teal-500' },
]

const tenants = [
  { name: 'Greenwood Academy', id: 'greenwood', students: 2847, staff: 186, status: 'active', plan: 'Enterprise' },
  { name: 'Delhi Public School', id: 'dps-rk', students: 4200, staff: 310, status: 'active', plan: 'Enterprise' },
  { name: 'St. Xavier\'s High School', id: 'stxaviers', students: 1850, staff: 120, status: 'active', plan: 'Pro' },
  { name: 'Modern School Barakhamba', id: 'modern-bkb', students: 3100, staff: 220, status: 'active', plan: 'Enterprise' },
  { name: 'Ryan International', id: 'ryan-intl', students: 980, staff: 78, status: 'trial', plan: 'Starter' },
]

const systemAlerts = [
  { time: '5 min ago', text: 'Backup completed for all tenants (24/24)', severity: 'info' },
  { time: '1 hr ago', text: 'SSL certificate renewed for *.synapse.edu', severity: 'info' },
  { time: '3 hr ago', text: 'High memory usage on worker-3 (89%)', severity: 'warning' },
  { time: '6 hr ago', text: 'New tenant onboarding: Ryan International School', severity: 'info' },
  { time: '12 hr ago', text: 'Database migration v2.14 applied successfully', severity: 'info' },
]

interface SuperAdminDashboardProps {
  tenantId: string
}

export function SuperAdminDashboard({ tenantId }: SuperAdminDashboardProps) {
  return (
    <div>
      <DashboardNavbar title="Super Admin Console" subtitle="System-wide overview" tenantId={tenantId} />

      {/* Profile + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <ProfileCard
          name="System Administrator"
          role="superadmin"
          email="sysadmin@synapse.edu"
          phone="+91 99999 00000"
        />
        <MenuCard
          to="/students"
          label="All Schools"
          description="Manage multi-tenant school instances"
          icon={Building2}
          color="text-indigo-500"
          bg="bg-indigo-50"
          count="24"
        />
        <MenuCard
          to="/attendance"
          label="System Health"
          description="Monitor infrastructure and uptime"
          icon={Server}
          color="text-green-500"
          bg="bg-green-50"
          count="99.97%"
        />
        <MenuCard
          to="/plugins/payroll"
          label="Access Control"
          description="Manage roles, permissions, and API keys"
          icon={Shield}
          color="text-red-500"
          bg="bg-red-50"
          count="48"
        />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {systemMetrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{m.label}</p>
                <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center ${m.iconColor}`}>
                <m.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs">
              {m.up ? (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className="text-green-600 font-medium">{m.change}</span>
              <span className="text-gray-400 ml-1">this month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Active Tenants</h3>
            <span className="text-xs text-gray-400">24 total</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">School</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Students</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.id}.synapse.edu</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{t.students.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{t.staff}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      t.plan === 'Enterprise' ? 'bg-purple-50 text-purple-700' :
                      t.plan === 'Pro' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{t.plan}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      t.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">System Alerts</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {systemAlerts.map((a, i) => (
              <div key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  a.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{a.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
