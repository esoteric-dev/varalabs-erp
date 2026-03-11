import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IndianRupee, Plus, Send } from 'lucide-react'
import { fetchFeeStructures, fetchFeeRecords, createFeeStructure, assignFeeToClass } from '../../lib/queries/fees'
import { fetchClasses } from '../../lib/queries/dashboard'
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
  const qc = useQueryClient()
  const { myRoles } = Route.useRouteContext()
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [classFilter, setClassFilter] = useState<string>('')
  const [newFee, setNewFee] = useState({ name: '', amount: '', frequency: 'monthly', className: '', academicYear: '2024-25' })
  const [assignModal, setAssignModal] = useState<{ structure: FeeStructure } | null>(null)
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assignMsg, setAssignMsg] = useState('')

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

  const { data: classes = [] } = useQuery<string[]>({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    enabled: !isStudent,
  })

  const createMutation = useMutation({
    mutationFn: () => createFeeStructure(
      newFee.name,
      Math.round(parseFloat(newFee.amount) * 100),
      newFee.frequency,
      newFee.className || undefined,
      newFee.academicYear || undefined,
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feeStructures'] })
      setNewFee({ name: '', amount: '', frequency: 'monthly', className: '', academicYear: '2024-25' })
      setShowCreateForm(false)
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ feeStructureId, className }: { feeStructureId: string; className: string }) =>
      assignFeeToClass(feeStructureId, className, assignDueDate || undefined),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['feeRecords'] })
      setAssignMsg(`Created ${count} fee record(s)`)
      setTimeout(() => { setAssignModal(null); setAssignMsg(''); setAssignDueDate('') }, 2000)
    },
  })

  const filteredStructures = classFilter
    ? structures.filter(s => s.className === classFilter)
    : structures

  const uniqueClasses = [...new Set(structures.map(s => s.className).filter(Boolean))] as string[]

  const totalPaid = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amountPaid, 0)
  const totalPending = records.filter(r => ['pending', 'partial', 'overdue'].includes(r.status)).reduce((sum, r) => sum + (r.amountDue - r.amountPaid), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isStudent ? 'My Fees' : 'Fees & Finance'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isStudent ? 'Your fee records and payment status' : 'Manage fee structures by class and track payments'}
          </p>
        </div>
        {!isStudent && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Fee Structure
          </button>
        )}
      </div>

      {/* Create Fee Structure Form */}
      {showCreateForm && !isStudent && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Fee Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              placeholder="Fee Name *"
              value={newFee.name}
              onChange={e => setNewFee(f => ({ ...f, name: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              placeholder="Amount (INR) *"
              type="number"
              step="0.01"
              value={newFee.amount}
              onChange={e => setNewFee(f => ({ ...f, amount: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={newFee.frequency}
              onChange={e => setNewFee(f => ({ ...f, frequency: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
              <option value="one_time">One Time</option>
            </select>
            <select
              value={newFee.className}
              onChange={e => setNewFee(f => ({ ...f, className: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newFee.name || !newFee.amount || createMutation.isPending}
              className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

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
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Fee Structures</h3>
              {uniqueClasses.length > 0 && (
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
            {loadingStructures ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : filteredStructures.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No fee structures{classFilter ? ` for ${classFilter}` : ''}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredStructures.map((s) => (
                  <div key={s.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      <span className="text-sm font-bold text-gray-900">{formatPaise(s.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="capitalize">{s.frequency.replace('_', ' ')}</span>
                        {s.className && <span>· {s.className}</span>}
                        <span>· {s.academicYear}</span>
                      </div>
                      {s.className && (
                        <button
                          onClick={() => setAssignModal({ structure: s })}
                          className="text-xs text-teal-600 font-medium hover:text-teal-800 flex items-center gap-1"
                          title="Assign to all students in this class"
                        >
                          <Send className="w-3 h-3" />
                          Assign
                        </button>
                      )}
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

      {/* Assign Fee Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setAssignModal(null); setAssignMsg('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Fee to Class</h3>
            <p className="text-sm text-gray-500 mb-4">
              Assign <strong>{assignModal.structure.name}</strong> ({formatPaise(assignModal.structure.amount)}) to all students in <strong>{assignModal.structure.className}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={assignDueDate}
              onChange={e => setAssignDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {assignMsg && (
              <p className="text-sm text-green-600 font-medium mb-3">{assignMsg}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAssignModal(null); setAssignMsg(''); setAssignDueDate('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  assignMutation.mutate({
                    feeStructureId: assignModal.structure.id,
                    className: assignModal.structure.className!,
                  })
                }
                disabled={assignMutation.isPending || !!assignMsg}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign to All Students'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
