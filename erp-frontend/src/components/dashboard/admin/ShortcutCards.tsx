import { Link } from '@tanstack/react-router'
import { CalendarCheck, Calendar, IndianRupee, BarChart3 } from 'lucide-react'

const shortcuts = [
  { to: '/attendance', label: 'View Attendance', icon: CalendarCheck, gradient: 'from-teal-500 to-teal-600' },
  { to: '/notices', label: 'New Events', icon: Calendar, gradient: 'from-blue-500 to-blue-600' },
  { to: '/fees', label: 'Fee Collection', icon: IndianRupee, gradient: 'from-amber-500 to-amber-600' },
  { to: '/payroll', label: 'Finance & Accounts', icon: BarChart3, gradient: 'from-purple-500 to-purple-600' },
]

export function ShortcutCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {shortcuts.map((s) => (
        <Link
          key={s.label}
          to={s.to as any}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 group"
        >
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
            <s.icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{s.label}</span>
        </Link>
      ))}
    </div>
  )
}
