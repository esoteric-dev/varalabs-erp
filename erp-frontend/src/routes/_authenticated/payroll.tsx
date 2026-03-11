import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, IndianRupee, Users, Clock, Plus, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { fetchPayrollRuns, fetchStaffSalaries, fetchPayrollEntries, createPayrollRun, setStaffSalary } from '../../lib/queries/payroll'
import { fetchOrgUsers } from '../../lib/queries/org-users'
import type { PayrollRun, StaffSalary, PayrollEntry } from '../../lib/queries/payroll'

export const Route = createFileRoute('/_authenticated/payroll')({
  component: PayrollPage,
})

function formatPaise(paise: number): string {
  if (paise >= 10000000) return `\u20B9${(paise / 10000000).toFixed(1)}Cr`
  if (paise >= 100000) return `\u20B9${(paise / 100000).toFixed(1)}L`
  if (paise >= 1000) return `\u20B9${(paise / 1000).toFixed(1)}K`
  return `\u20B9${(paise / 100).toFixed(0)}`
}

function formatCurrency(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function PayrollPage() {
  const qc = useQueryClient()
  const [showRunModal, setShowRunModal] = useState(false)
  const [showSalaryForm, setShowSalaryForm] = useState(false)
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1)
  const [runYear, setRunYear] = useState(new Date().getFullYear())
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [salaryForm, setSalaryForm] = useState({ userId: '', basicPay: '', allowances: '', deductions: '', effectiveFrom: '' })

  const { data: runs = [], isLoading: loadingRuns } = useQuery<PayrollRun[]>({
    queryKey: ['payrollRuns'],
    queryFn: fetchPayrollRuns,
  })

  const { data: salaries = [], isLoading: loadingSalaries } = useQuery<StaffSalary[]>({
    queryKey: ['staffSalaries'],
    queryFn: fetchStaffSalaries,
  })

  const { data: orgUsers = [] } = useQuery({
    queryKey: ['orgUsers'],
    queryFn: fetchOrgUsers,
  })

  const [staffSearch, setStaffSearch] = useState('')

  const staffOnly = useMemo(
    () => orgUsers.filter(u => !u.roleNames?.toLowerCase().includes('student')),
    [orgUsers],
  )

  const filteredStaff = useMemo(
    () => staffOnly.filter(u =>
      u.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(staffSearch.toLowerCase()))
    ),
    [staffOnly, staffSearch],
  )

  const { data: expandedEntries = [] } = useQuery<PayrollEntry[]>({
    queryKey: ['payrollEntries', expandedRun],
    queryFn: () => fetchPayrollEntries(expandedRun!),
    enabled: !!expandedRun,
  })

  const runMutation = useMutation({
    mutationFn: () => createPayrollRun(runMonth, runYear),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payrollRuns'] })
      setShowRunModal(false)
    },
  })

  const salaryMutation = useMutation({
    mutationFn: () => setStaffSalary(
      salaryForm.userId,
      Math.round(parseFloat(salaryForm.basicPay) * 100),
      Math.round(parseFloat(salaryForm.allowances || '0') * 100),
      Math.round(parseFloat(salaryForm.deductions || '0') * 100),
      salaryForm.effectiveFrom || undefined,
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffSalaries'] })
      setSalaryForm({ userId: '', basicPay: '', allowances: '', deductions: '', effectiveFrom: '' })
      setStaffSearch('')
      setShowSalaryForm(false)
    },
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
          <button
            onClick={() => setShowSalaryForm(!showSalaryForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Set Salary
          </button>
          <button
            onClick={() => setShowRunModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Set Salary Modal */}
      {showSalaryForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowSalaryForm(false); setStaffSearch('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Set Staff Salary</h3>
              <button onClick={() => { setShowSalaryForm(false); setStaffSearch('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staff Search & Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name or ID..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                {filteredStaff.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center">No staff found</p>
                ) : (
                  filteredStaff.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSalaryForm(f => ({ ...f, userId: u.id }))}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors ${
                        salaryForm.userId === u.id ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {u.name}
                      {u.employeeId && <span className="ml-2 text-xs text-gray-400">({u.employeeId})</span>}
                      {u.roleNames && <span className="ml-2 text-xs text-gray-400">{u.roleNames}</span>}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Salary Fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Pay (INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 25000"
                  value={salaryForm.basicPay}
                  onChange={e => setSalaryForm(f => ({ ...f, basicPay: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowances (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={salaryForm.allowances}
                    onChange={e => setSalaryForm(f => ({ ...f, allowances: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deductions (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={salaryForm.deductions}
                    onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                <input
                  type="date"
                  value={salaryForm.effectiveFrom}
                  onChange={e => setSalaryForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {salaryMutation.isError && (
              <p className="text-sm text-red-600 mb-3">Failed to set salary. Please try again.</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowSalaryForm(false); setStaffSearch('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={() => salaryMutation.mutate()}
                disabled={!salaryForm.userId || !salaryForm.basicPay || salaryMutation.isPending}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {salaryMutation.isPending ? 'Saving...' : 'Save Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          ) : runs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No payroll runs yet. Set staff salaries, then run payroll.</div>
          ) : (
            <div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Gross</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Net</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Processed</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {runs.map((r) => (
                    <>
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedRun(expandedRun === r.id ? null : r.id)}
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{monthNames[r.month]} {r.year}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{formatCurrency(r.totalGross)}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatCurrency(r.totalNet)}</td>
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
                        <td className="px-5 py-3.5 text-gray-400">
                          {expandedRun === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>
                      {expandedRun === r.id && (
                        <tr key={`${r.id}-detail`}>
                          <td colSpan={6} className="bg-gray-50 px-5 py-4">
                            {expandedEntries.length === 0 ? (
                              <p className="text-sm text-gray-400 text-center">No entries</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {expandedEntries.map(e => (
                                  <div key={e.id} className="bg-white rounded-lg border border-gray-100 p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-800">{e.userName}</span>
                                      <span className="text-sm font-bold text-teal-700">{formatCurrency(e.netPay)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      Basic: {formatCurrency(e.basicPay)} + Allowances: {formatCurrency(e.allowances)} - Deductions: {formatCurrency(e.deductions)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Salaries */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Staff Salaries</h3>
          </div>
          {loadingSalaries ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : salaries.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No salary records yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {salaries.map((s) => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.userName}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(s.basicPay + s.allowances - s.deductions)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Basic: {formatCurrency(s.basicPay)}</span>
                    <span>+{formatCurrency(s.allowances)}</span>
                    <span>-{formatCurrency(s.deductions)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Run Payroll Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRunModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Run Payroll</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={runMonth}
                  onChange={e => setRunMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {monthNames.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={runYear}
                  onChange={e => setRunYear(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This will generate payslips for all staff with active salary records.
              {salaries.length > 0 ? ` (${salaries.length} staff members)` : ' No salary records found.'}
            </p>
            {runMutation.isError && (
              <p className="text-sm text-red-600 mb-3">Failed to run payroll. A run for this month may already exist.</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRunModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || salaries.length === 0}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {runMutation.isPending ? 'Processing...' : 'Run Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
