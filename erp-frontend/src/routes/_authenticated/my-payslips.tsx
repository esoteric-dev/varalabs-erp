import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { fetchMyPayslips } from '../../lib/queries/teacher'
import type { MyPayslip } from '../../lib/queries/teacher'

export const Route = createFileRoute('/_authenticated/my-payslips')({
  component: MyPayslipsPage,
})

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

function MyPayslipsPage() {
  const { data: payslips = [], isLoading } = useQuery<MyPayslip[]>({
    queryKey: ['myPayslips'],
    queryFn: fetchMyPayslips,
  })

  const latestNet = payslips.length > 0 ? payslips[0].netPay : 0
  const ytdGross = payslips.reduce((sum, p) => sum + p.basicPay + p.allowances, 0)
  const ytdDeductions = payslips.reduce((sum, p) => sum + p.deductions, 0)
  const ytdNet = payslips.reduce((sum, p) => sum + p.netPay, 0)

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading payslips...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Payslips</h1>
        <p className="text-sm text-gray-500 mt-1">View your salary and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Latest Net Pay</p>
          <p className="text-lg font-bold text-gray-900">{formatPaise(latestNet)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">YTD Gross</p>
          <p className="text-lg font-bold text-gray-900">{formatPaise(ytdGross)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">YTD Deductions</p>
          <p className="text-lg font-bold text-red-600">{formatPaise(ytdDeductions)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">YTD Net</p>
          <p className="text-lg font-bold text-teal-600">{formatPaise(ytdNet)}</p>
        </div>
      </div>

      {/* Payslips Table */}
      {payslips.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No payslips available</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Basic Pay</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Allowances</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Deductions</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Net Pay</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-700">
                    {monthNames[p.month - 1]} {p.year}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-right">{formatPaise(p.basicPay)}</td>
                  <td className="px-5 py-3 text-green-600 text-right">+{formatPaise(p.allowances)}</td>
                  <td className="px-5 py-3 text-red-600 text-right">-{formatPaise(p.deductions)}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900 text-right">{formatPaise(p.netPay)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      p.runStatus === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.runStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
