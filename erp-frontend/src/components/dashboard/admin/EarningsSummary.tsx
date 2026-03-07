import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react'
import type { ReportSummary } from '../../../lib/queries/reports'

interface EarningsSummaryProps {
  summary: ReportSummary | undefined
}

export function EarningsSummary({ summary }: EarningsSummaryProps) {
  const fmtCurrency = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  const earnings = summary?.totalEarnings || summary?.feesCollected || 0
  const expenses = summary?.totalExpenses || 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Earnings & Expenses</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200/20 rounded-full -translate-y-4 translate-x-4" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmtCurrency(earnings)}</p>
          <p className="text-xs text-emerald-600/70 mt-0.5">Total Earnings</p>
        </div>
        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-100">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-200/20 rounded-full -translate-y-4 translate-x-4" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-700">{fmtCurrency(expenses)}</p>
          <p className="text-xs text-red-600/70 mt-0.5">Total Expenses</p>
        </div>
      </div>
    </div>
  )
}
