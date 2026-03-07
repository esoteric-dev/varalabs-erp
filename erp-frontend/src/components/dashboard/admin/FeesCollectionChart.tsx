import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { WidgetHeader } from './WidgetHeader'
import { TimeFilterDropdown } from './TimeFilterDropdown'
import type { ReportSummary } from '../../../lib/queries/reports'

const BAR_COLORS = ['#0d9488', '#94a3b8']

const PERIOD_OPTIONS = [
  { label: 'Last 8 Quarter', value: 'last_8_quarter' },
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
]

interface FeesCollectionChartProps {
  summary: ReportSummary | undefined
  fmtCurrency: (v: number) => string
}

export function FeesCollectionChart({ summary, fmtCurrency }: FeesCollectionChartProps) {
  const [period, setPeriod] = useState('last_8_quarter')

  const feeChartData = summary ? [
    { q: 'Q1', collected: summary.feesCollected / 400, total: (summary.feesCollected + summary.feesPending) / 400 },
    { q: 'Q2', collected: summary.feesCollected / 300, total: (summary.feesCollected + summary.feesPending) / 300 },
    { q: 'Q3', collected: summary.feesCollected / 200, total: (summary.feesCollected + summary.feesPending) / 200 },
    { q: 'Q4', collected: summary.feesCollected / 100, total: (summary.feesCollected + summary.feesPending) / 100 },
  ] : []

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
      <WidgetHeader
        title="Fees Collection"
        rightContent={<TimeFilterDropdown value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />}
      />
      {feeChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={feeChartData} barCategoryGap="20%">
            <XAxis dataKey="q" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
            <Tooltip formatter={(v) => fmtCurrency(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="collected" name="Collected" fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Total Due" fill={BAR_COLORS[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No fee data</div>
      )}
    </div>
  )
}
