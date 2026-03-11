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
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredStudents = searchQuery.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.loginEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students

  // Group students by class
  const studentsByClass: Record<string, Student[]> = {}
  for (const s of filteredStudents) {
    const cls = s.className || 'Unassigned'
    if (!studentsByClass[cls]) studentsByClass[cls] = []
    studentsByClass[cls].push(s)
  }
  const sortedClasses = Object.keys(studentsByClass).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Directory</h2>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} students enrolled</p>
        </div>
        <Link
          to="/students/add-student"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Credentials Card */}
      {credentialsCard && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
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
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Login Email</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-slate-800">{credentialsCard.email}</span>
                <button
                  onClick={() => copyToClipboard(credentialsCard.email, 'reset-email')}
                  className="text-slate-400 hover:text-teal-600 transition-colors"
                >
                  {copiedField === 'reset-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-slate-800">{credentialsCard.password}</span>
                <button
                  onClick={() => copyToClipboard(credentialsCard.password, 'reset-pw')}
                  className="text-slate-400 hover:text-teal-600 transition-colors"
                >
                  {copiedField === 'reset-pw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, class, admission number..."
          className="pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 animate-spin mb-2 block">progress_activity</span>
          <p className="text-sm text-slate-400">Loading students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">school</span>
          <p className="text-sm text-slate-400">{searchQuery ? 'No students match your search' : 'No students found'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedClasses.map(className => (
            <div key={className}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Class {className}</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold">
                  {studentsByClass[className].length}
                </span>
                <div className="flex-1 border-t border-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {studentsByClass[className].map(s => (
                  <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="block p-5"
                    >
                      <div className="flex items-center gap-3.5 mb-3">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt={s.name} className="size-12 rounded-full object-cover border-2 border-slate-100" />
                        ) : (
                          <div className="size-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold border-2 border-slate-100">
                            {s.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{s.name}</h4>
                          <p className="text-xs text-slate-500">
                            {s.admissionNumber || `ID: ${s.id.slice(0, 8)}`}
                          </p>
                        </div>
                      </div>
                      {s.loginEmail && (
                        <p className="text-xs text-slate-400 font-mono truncate mb-1">{s.loginEmail}</p>
                      )}
                    </Link>
                    <div className="px-5 pb-4 flex items-center gap-2">
                      <Link
                        to="/students/$studentId"
                        params={{ studentId: s.id }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        View Profile
                      </Link>
                      <span className="text-slate-200">|</span>
                      {s.userId ? (
                        <button
                          onClick={() => resetPasswordMutation.mutate({ userId: s.userId! })}
                          disabled={resetPasswordMutation.isPending}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
                        >
                          <KeyRound className="w-3 h-3" />
                          Reset
                        </button>
                      ) : (
                        <button
                          onClick={() => createCredentialsMutation.mutate({ studentId: s.id })}
                          disabled={createCredentialsMutation.isPending}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          Create Login
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
