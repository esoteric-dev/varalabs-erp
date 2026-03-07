import type { LucideIcon } from 'lucide-react'
import { Users, GraduationCap, UserCheck, BookOpen } from 'lucide-react'
import type { ReportSummary } from '../../../lib/queries/reports'

interface StatCardData {
  label: string
  value: string
  active: number
  inactive: number
  icon: LucideIcon
  gradient: string
  lightBg: string
  lightText: string
}

interface StatCardsProps {
  summary: ReportSummary | undefined
}

export function StatCards({ summary }: StatCardsProps) {
  const fmt = (v: number) => v.toLocaleString('en-IN')

  const cards: StatCardData[] = summary ? [
    { label: 'Total Students', value: fmt(summary.totalStudents), active: summary.activeStudents, inactive: summary.inactiveStudents, icon: Users, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50', lightText: 'text-blue-600' },
    { label: 'Total Teachers', value: fmt(summary.totalTeachers), active: summary.activeTeachers, inactive: summary.inactiveTeachers, icon: GraduationCap, gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50', lightText: 'text-amber-600' },
    { label: 'Total Staff', value: fmt(summary.totalStaff), active: summary.activeStaff, inactive: summary.inactiveStaff, icon: UserCheck, gradient: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-50', lightText: 'text-purple-600' },
    { label: 'Total Subjects', value: fmt(summary.totalSubjects), active: summary.activeSubjects, inactive: summary.inactiveSubjects, icon: BookOpen, gradient: 'from-teal-500 to-teal-600', lightBg: 'bg-teal-50', lightText: 'text-teal-600' },
  ] : []

  if (!summary) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
              <p className={`text-3xl font-bold mt-1 ${c.lightText}`}>{c.value}</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span className="text-emerald-600">Active: {fmt(c.active)}</span>
                <span className="text-red-400">Inactive: {fmt(c.inactive)}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <c.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
