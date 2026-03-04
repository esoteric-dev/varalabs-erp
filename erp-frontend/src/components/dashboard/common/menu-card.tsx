import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

interface MenuCardProps {
  to: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  bg: string
  count?: string | number
}

export function MenuCard({ to, label, description, icon: Icon, color, bg, count }: MenuCardProps) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {count !== undefined && (
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <h4 className="text-sm font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">{label}</h4>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ChevronRight className="w-3 h-3" />
      </div>
    </Link>
  )
}
