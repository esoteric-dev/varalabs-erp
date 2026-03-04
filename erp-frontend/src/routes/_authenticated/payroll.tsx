import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar, IndianRupee, Users, Clock } from 'lucide-react'
import { fetchPayrollRuns, fetchStaffSalaries } from '../../lib/queries/payroll'
import type { PayrollRun, StaffSalary } from '../../lib/queries/payroll'

export const Route = createFileRoute('/_authenticated/payroll')({
  component: PayrollPage,
})

function formatPaise(paise: number): string {
  if (paise >= 10000000) return `\u20B9${(paise / 10000000).toFixed(1)}Cr`
  if (paise >= 100000) return `\u20B9${(paise / 100000).toFixed(1)}L`
  if (paise >= 1000) return `\u20B9${(paise / 1000).toFixed(1)}K`
  return `\u20B9${(paise / 100).toFixed(0)}`
}

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function PayrollPage() {
  const { data: runs = [], isLoading: loadingRuns } = useQuery<PayrollRun[]>({
    queryKey: ['payrollRuns'],
    queryFn: fetchPayrollRuns,
  })

  const { data: salaries = [], isLoading: loadingSalaries } = useQuery<StaffSalary[]>({
    queryKey: ['staffSalaries'],
    queryFn: fetchStaffSalaries,
  })

  const latestRun = runs[0]
  const totalStaff = salaries.length
  const totalGross = latestRun ? latestRun.totalGross : 0
  const totalNet = latestRun ? latestRun.totalNet : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll</h2>
          <p className="text-sm text-gray-500 mt-0.5">Staff salary processing and management</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">
            <Calendar className="w-4 h-4" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Monthly Gross</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalGross)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Net Disbursed</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalNet)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Total Staff</p>
              <p className="text-xl font-bold text-gray-900">{totalStaff}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Latest Run</p>
              <p className="text-xl font-bold text-gray-900">
                {latestRun ? `${monthNames[latestRun.month]} ${latestRun.year}` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Payroll History</h3>
          </div>
          {loadingRuns ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Gross</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Net</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{monthNames[r.month]} {r.year}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatPaise(r.totalGross)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatPaise(r.totalNet)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        r.status === 'completed' ? 'bg-green-50 text-green-700' :
                        r.status === 'processing' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {r.processedAt ? new Date(r.processedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Staff Salaries */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Staff Salaries</h3>
          </div>
          {loadingSalaries ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {salaries.map((s) => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.userName}</span>
                    <span className="text-sm font-bold text-gray-900">{formatPaise(s.basicPay + s.allowances - s.deductions)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Basic: {formatPaise(s.basicPay)}</span>
                    <span>+{formatPaise(s.allowances)}</span>
                    <span>-{formatPaise(s.deductions)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
