import { Clock } from 'lucide-react'

interface DashboardNavbarProps {
  title: string
  subtitle: string
  tenantId: string
}

export function DashboardNavbar({ title, subtitle, tenantId }: DashboardNavbarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {subtitle} &middot; <span className="text-teal-600 font-medium">{tenantId}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock className="w-4 h-4" />
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}
