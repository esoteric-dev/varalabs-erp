import { TrendingUp, IndianRupee } from 'lucide-react'
import type { ReportSummary } from '../../../lib/queries/reports'

interface FinancialSummaryProps {
  summary: ReportSummary | undefined
}

export function FinancialSummary({ summary }: FinancialSummaryProps) {
  const fmtCurrency = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  const cards = summary ? [
    { label: 'Total Fees Collected', value: fmtCurrency(summary.feesCollected), color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    { label: 'Fine Collected', value: fmtCurrency(summary.feesFine), color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-100' },
    { label: 'Students Not Paid', value: summary.pendingAdmissions.toLocaleString('en-IN'), color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-100' },
    { label: 'Total Outstanding', value: fmtCurrency(summary.feesOutstanding), color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-100' },
  ] : []

  if (!summary) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.borderColor} ${c.bg} p-4 hover:shadow-md transition-shadow`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${c.color}`}>
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
