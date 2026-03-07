import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Search, Plus, Copy, Check, KeyRound, UserPlus, X } from 'lucide-react'
import { fetchStudents, createStudentCredentials } from '../../../lib/queries/students'
import { resetUserPassword } from '../../../lib/queries/user'
import type { Student } from '../../../lib/queries/students'

export const Route = createFileRoute('/_authenticated/students/')({
  component: StudentDirectory,
})

function StudentDirectory() {
  const queryClient = useQueryClient()
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: fetchStudents,
  })
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [credentialsCard, setCredentialsCard] = useState<{ label: string; name: string; email: string; password: string } | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      resetUserPassword(userId),
    onSuccess: (data, variables) => {
      if (data.generatedPassword) {
        const student = students.find(s => s.userId === variables.userId)
        setCredentialsCard({
          label: 'Password Reset',
          name: student?.name || '',
          email: student?.loginEmail || '',
          password: data.generatedPassword,
        })
      }
    },
  })

  const createCredentialsMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) =>
      createStudentCredentials(studentId),
    onSuccess: (data) => {
      setCredentialsCard({
        label: 'Credentials Created',
        name: data.student.name,
        email: data.generatedEmail,
        password: data.generatedPassword,
      })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Directory</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage and view all enrolled students</p>
        </div>
        <Link
          to="/students/add-student"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Credentials Card */}
      {credentialsCard && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">{credentialsCard.label} — {credentialsCard.name}</h3>
              <p className="text-xs text-amber-600 mb-3">Save these credentials. The password will not be shown again.</p>
            </div>
            <button onClick={() => setCredentialsCard(null)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-amber-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Login Email</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800">{credentialsCard.email}</span>
                <button
                  onClick={() => copyToClipboard(credentialsCard.email, 'reset-email')}
                  className="text-gray-400 hover:text-teal-600 transition-colors"
                >
                  {copiedField === 'reset-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Password</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-800">{credentialsCard.password}</span>
                <button
                  onClick={() => copyToClipboard(credentialsCard.password, 'reset-pw')}
                  className="text-gray-400 hover:text-teal-600 transition-colors"
                >
                  {copiedField === 'reset-pw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search students..."
            className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : students.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No students found</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Adm. No.</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Login Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-800 hover:text-teal-600 transition-colors">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.className}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{s.admissionNumber || '-'}</td>
                  <td className="px-5 py-3.5">
                    {s.loginEmail ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-600 font-mono">{s.loginEmail}</span>
                        <button
                          onClick={() => copyToClipboard(s.loginEmail!, `email-${s.id}`)}
                          className="text-gray-400 hover:text-teal-600 transition-colors"
                          title="Copy email"
                        >
                          {copiedField === `email-${s.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No account</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/students/$studentId"
                        params={{ studentId: s.id }}
                        className="text-xs text-teal-600 hover:underline font-medium"
                      >
                        View
                      </Link>
                      {s.userId ? (
                        <button
                          onClick={() => resetPasswordMutation.mutate({ userId: s.userId! })}
                          disabled={resetPasswordMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors disabled:opacity-50"
                          title="Reset password"
                        >
                          <KeyRound className="w-3 h-3" />
                          Reset
                        </button>
                      ) : (
                        <button
                          onClick={() => createCredentialsMutation.mutate({ studentId: s.id })}
                          disabled={createCredentialsMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors disabled:opacity-50"
                          title="Create credentials"
                        >
                          <UserPlus className="w-3 h-3" />
                          Create Credentials
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
