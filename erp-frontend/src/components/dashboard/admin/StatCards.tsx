import type { ReportSummary } from '../../../lib/queries/reports'

interface StatCardsProps {
  summary: ReportSummary | undefined
}

export function StatCards({ summary }: StatCardsProps) {
  if (!summary) return null

  const fmt = (v: number) => v.toLocaleString('en-IN')

  const fmtCurrency = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  const dailyRevenue = fmtCurrency(summary.feesCollected)

  const cards = [
    {
      label: 'Total Students',
      value: fmt(summary.totalStudents),
      valueSuffix: undefined as string | undefined,
      badgeText: `+${fmt(summary.activeStudents)} active`,
      badgeColor: 'text-green-600 bg-green-50',
      badgeIcon: 'trending_up',
      iconBg: 'bg-blue-50 text-blue-600',
      icon: 'groups',
    },
    {
      label: 'Total Staff',
      value: fmt(summary.totalStaff),
      valueSuffix: undefined as string | undefined,
      badgeText: `${fmt(summary.activeTeachers)} teachers, ${fmt(summary.activeStaff - summary.activeTeachers)} staff`,
      badgeColor: 'text-teal-600 bg-teal-50',
      badgeIcon: 'badge',
      iconBg: 'bg-teal-50 text-teal-600',
      icon: 'supervisor_account',
    },
    {
      label: 'Fees Collected',
      value: dailyRevenue,
      valueSuffix: undefined as string | undefined,
      badgeText: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      badgeColor: 'text-slate-500 bg-slate-50',
      badgeIcon: 'calendar_today',
      iconBg: 'bg-purple-50 text-purple-600',
      icon: 'payments',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{c.label}</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {c.value}
              {c.valueSuffix && <span className="text-lg text-slate-400 font-normal">{c.valueSuffix}</span>}
            </h3>
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${c.badgeColor} w-fit px-2 py-0.5 rounded-full`}>
              <span className="material-symbols-outlined text-sm">{c.badgeIcon}</span>
              <span>{c.badgeText}</span>
            </div>
          </div>
          <div className={`size-14 rounded-full ${c.iconBg} flex items-center justify-center`}>
            <span className="material-symbols-outlined text-3xl">{c.icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
