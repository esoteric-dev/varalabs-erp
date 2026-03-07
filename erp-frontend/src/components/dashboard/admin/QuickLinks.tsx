import { Link } from '@tanstack/react-router'
import {
  CalendarCheck, IndianRupee, FileText, BookOpen, Users, BarChart3,
} from 'lucide-react'

const quickLinks = [
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, color: 'text-green-500', bg: 'bg-green-50' },
  { to: '/fees', label: 'Fees', icon: IndianRupee, color: 'text-amber-500', bg: 'bg-amber-50' },
  { to: '/reports', label: 'Exam Result', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { to: '/assignments', label: 'Home Works', icon: BookOpen, color: 'text-rose-500', bg: 'bg-rose-50' },
  { to: '/students', label: 'Students', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
  { to: '/reports', label: 'Reports', icon: BarChart3, color: 'text-teal-500', bg: 'bg-teal-50' },
]

export function QuickLinks() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Quick Links</h3>
      <div className="grid grid-cols-3 gap-3">
        {quickLinks.map((ql) => (
          <Link
            key={ql.label}
            to={ql.to as any}
            className={`flex flex-col items-center p-3 rounded-xl ${ql.bg} hover:shadow-md transition-all duration-200 group`}
          >
            <ql.icon className={`w-6 h-6 ${ql.color} group-hover:scale-110 transition-transform`} />
            <span className="text-xs font-medium text-gray-600 mt-2">{ql.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
