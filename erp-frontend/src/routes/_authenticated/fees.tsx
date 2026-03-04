import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IndianRupee } from 'lucide-react'
import { fetchFeeStructures, fetchFeeRecords } from '../../lib/queries/fees'
import { fetchMyStudent } from '../../lib/queries/students'
import type { FeeStructure, FeeRecord } from '../../lib/queries/fees'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/fees')({
  component: FeesPage,
})

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}

const statusColors: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  pending: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-50 text-red-700',
  waived: 'bg-gray-50 text-gray-500',
}

function FeesPage() {
  const { myRoles } = Route.useRouteContext()
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')

  const { data: myStudent } = useQuery({
    queryKey: ['myStudent'],
    queryFn: fetchMyStudent,
    enabled: isStudent,
  })

  const studentId = isStudent ? myStudent?.id : undefined

  const { data: structures = [], isLoading: loadingStructures } = useQuery<FeeStructure[]>({
    queryKey: ['feeStructures'],
    queryFn: fetchFeeStructures,
    enabled: !isStudent,
  })

  const { data: records = [], isLoading: loadingRecords } = useQuery<FeeRecord[]>({
    queryKey: ['feeRecords', studentId],
    queryFn: () => fetchFeeRecords(studentId),
    enabled: !isStudent || !!studentId,
  })

  const totalPaid = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amountPaid, 0)
  const totalPending = records.filter(r => ['pending', 'partial', 'overdue'].includes(r.status)).reduce((sum, r) => sum + (r.amountDue - r.amountPaid), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isStudent ? 'My Fees' : 'Fees'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isStudent ? 'Your fee records and payment status' : 'Fee structures and student payment records'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 ${isStudent ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 mb-8`}>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">{isStudent ? 'Paid' : 'Collected'}</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Pending</p>
              <p className="text-xl font-bold text-gray-900">{formatPaise(totalPending)}</p>
            </div>
          </div>
        </div>
        {!isStudent && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Fee Structures</p>
                <p className="text-xl font-bold text-gray-900">{structures.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isStudent ? '' : 'lg:grid-cols-3'} gap-6`}>
        {/* Fee Structures (admin/teacher only) */}
        {!isStudent && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Fee Structures</h3>
            </div>
            {loadingStructures ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {structures.map((s) => (
                  <div key={s.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      <span className="text-sm font-bold text-gray-900">{formatPaise(s.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="capitalize">{s.frequency.replace('_', ' ')}</span>
                      {s.className && <span>· {s.className}</span>}
                      <span>· {s.academicYear}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fee Records */}
        <div className={`${isStudent ? '' : 'lg:col-span-2'} bg-white rounded-xl border border-gray-100 overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{isStudent ? 'My Fee Records' : 'Student Fee Records'}</h3>
          </div>
          {loadingRecords ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : records.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No fee records</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {!isStudent && <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>}
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    {!isStudent && <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{r.studentName}</td>}
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.feeName}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatPaise(r.amountDue)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatPaise(r.amountPaid)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[r.status] || 'bg-gray-50 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{r.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
