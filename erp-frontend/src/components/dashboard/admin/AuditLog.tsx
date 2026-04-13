import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../../lib/queries/dashboard'
import type { AuditLog } from '../../../lib/queries/dashboard'
import { Shield, UserPlus, UserMinus, Edit, Key, DollarSign, Settings, FileText, AlertTriangle } from 'lucide-react'

const actionIcons: Record<string, { icon: any; bg: string; color: string }> = {
  'student.created': { icon: UserPlus, bg: 'bg-blue-50', color: 'text-blue-600' },
  'student.updated': { icon: Edit, bg: 'bg-amber-50', color: 'text-amber-600' },
  'student.deleted': { icon: UserMinus, bg: 'bg-red-50', color: 'text-red-600' },
  'user.created': { icon: UserPlus, bg: 'bg-green-50', color: 'text-green-600' },
  'user.updated': { icon: Edit, bg: 'bg-amber-50', color: 'text-amber-600' },
  'user.deleted': { icon: UserMinus, bg: 'bg-red-50', color: 'text-red-600' },
  'user.password_reset': { icon: Key, bg: 'bg-purple-50', color: 'text-purple-600' },
  'user.role_assigned': { icon: Shield, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  'fee.collected': { icon: DollarSign, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  'fee.updated': { icon: DollarSign, bg: 'bg-orange-50', color: 'text-orange-600' },
  'settings.updated': { icon: Settings, bg: 'bg-slate-50', color: 'text-slate-600' },
  'onboarding.config_updated': { icon: FileText, bg: 'bg-cyan-50', color: 'text-cyan-600' },
  'security.login_failed': { icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600' },
}

function getActionStyle(action: string) {
  return actionIcons[action] || { icon: Edit, bg: 'bg-slate-50', color: 'text-slate-600' }
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    'student.created': 'Student Created',
    'student.updated': 'Student Updated',
    'student.deleted': 'Student Deleted',
    'user.created': 'User Created',
    'user.updated': 'User Updated',
    'user.deleted': 'User Deleted',
    'user.password_reset': 'Password Reset',
    'user.role_assigned': 'Role Assigned',
    'fee.collected': 'Fee Collected',
    'fee.updated': 'Fee Updated',
    'settings.updated': 'Settings Updated',
    'onboarding.config_updated': 'Onboarding Config Updated',
    'security.login_failed': 'Login Failed',
  }
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function getSensitiveTag(action: string) {
  const sensitive = ['user.password_reset', 'user.deleted', 'security.login_failed', 'settings.updated']
  return sensitive.includes(action)
}

export function AuditLog() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs'],
    queryFn: () => fetchAuditLogs(50),
    staleTime: 1 * 60_000,
  })

  const recentLogs = logs.slice(0, 10)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Audit Log
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {recentLogs.length > 0 ? `${logs.length} entries` : 'Tracking active'}
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-slate-200 animate-spin block mb-2">progress_activity</span>
          <p className="text-sm text-slate-400">Loading audit log...</p>
        </div>
      ) : recentLogs.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">No audit entries yet</p>
          <p className="text-xs text-slate-300 mt-1">Admin actions will be tracked here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentLogs.map((log) => {
            const style = getActionStyle(log.action)
            const IconComponent = style.icon
            const isSensitive = getSensitiveTag(log.action)

            return (
              <div
                key={log.id}
                className="relative flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                {/* Icon */}
                <div className={`size-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                  <IconComponent className={`w-5 h-5 ${style.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">
                      {getActionLabel(log.action)}
                    </p>
                    {isSensitive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                        Sensitive
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-medium">{log.entityName}</span>
                    {log.details && <span className="text-slate-400"> — {log.details}</span>}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">{log.performedByName}</span>
                    <span>•</span>
                    <span>{formatTimestamp(log.createdAt)}</span>
                    {log.ipAddress && (
                      <>
                        <span>•</span>
                        <span className="font-mono">{log.ipAddress}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
