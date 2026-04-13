import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Search, Plus, Copy, Check, KeyRound, UserPlus, X, Filter, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { fetchStudents, createStudentCredentials } from '../../../lib/queries/students'
import { resetUserPassword } from '../../../lib/queries/user'
import type { Student } from '../../../lib/queries/students'

export const Route = createFileRoute('/_authenticated/students/')({
  component: StudentDirectory,
})

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: keyof Student | 'classNumber'
  direction: SortDirection
}

function StudentDirectory() {
  const queryClient = useQueryClient()
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: fetchStudents,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [credentialsCard, setCredentialsCard] = useState<{ label: string; name: string; email: string; password: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [filterClass, setFilterClass] = useState<string>('')
  const [filterGender, setFilterGender] = useState<string>('')
  const [filterHasLogin, setFilterHasLogin] = useState<string>('')

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

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

  // Get unique classes for filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean))
    return Array.from(classes).sort()
  }, [students])

  // Get unique genders for filter dropdown
  const uniqueGenders = useMemo(() => {
    const genders = new Set(students.map(s => s.gender).filter(Boolean))
    return Array.from(genders).sort()
  }, [students])

  // Apply filters and search
  const filteredStudents = useMemo(() => {
    let result = students

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.className?.toLowerCase().includes(query) ||
        s.admissionNumber?.toLowerCase().includes(query) ||
        s.loginEmail?.toLowerCase().includes(query) ||
        s.gender?.toLowerCase().includes(query)
      )
    }

    // Class filter
    if (filterClass) {
      result = result.filter(s => s.className === filterClass)
    }

    // Gender filter
    if (filterGender) {
      result = result.filter(s => s.gender === filterGender)
    }

    // Login status filter
    if (filterHasLogin === 'yes') {
      result = result.filter(s => s.loginEmail)
    } else if (filterHasLogin === 'no') {
      result = result.filter(s => !s.loginEmail)
    }

    return result
  }, [students, searchQuery, filterClass, filterGender, filterHasLogin])

  // Apply sorting
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents]
    const { key, direction } = sortConfig

    if (!direction) return sorted

    sorted.sort((a, b) => {
      let aVal: any = a[key as keyof Student]
      let bVal: any = b[key as keyof Student]

      // Handle class number sorting
      if (key === 'className') {
        aVal = parseInt(a.className?.replace(/\D/g, '') || '0') || 0
        bVal = parseInt(b.className?.replace(/\D/g, '') || '0') || 0
      }

      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

    return sorted
  }, [filteredStudents, sortConfig])

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key
        ? prev.direction === 'asc'
          ? 'desc'
          : prev.direction === 'desc'
            ? null
            : 'asc'
        : 'asc',
    }))
  }

  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-300" />
    }
    if (sortConfig.direction === 'asc') return <ChevronUp className="w-4 h-4 text-teal-600" />
    if (sortConfig.direction === 'desc') return <ChevronDown className="w-4 h-4 text-teal-600" />
    return <ChevronsUpDown className="w-4 h-4 text-slate-300" />
  }

  const activeFilterCount = [filterClass, filterGender, filterHasLogin].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Directory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {sortedStudents.length} of {students.length} students
            {activeFilterCount > 0 && ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
          </p>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, class, admission number, email..."
              className="pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterClass('')
                setFilterGender('')
                setFilterHasLogin('')
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Class</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Gender</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Genders</option>
                {uniqueGenders.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Login Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Login Status</label>
              <select
                value={filterHasLogin}
                onChange={(e) => setFilterHasLogin(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Students</option>
                <option value="yes">Has Login</option>
                <option value="no">No Login</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 animate-spin mb-2 block">progress_activity</span>
          <p className="text-sm text-slate-400">Loading students...</p>
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">school</span>
          <p className="text-sm text-slate-400">{searchQuery || activeFilterCount > 0 ? 'No students match your filters' : 'No students found'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    onClick={() => handleSort('admissionNumber')}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Admission #
                      <SortIcon columnKey="admissionNumber" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Student Name
                      <SortIcon columnKey="name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('className')}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Class
                      <SortIcon columnKey="className" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('gender')}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Gender
                      <SortIcon columnKey="gender" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('loginEmail')}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Login Email
                      <SortIcon columnKey="loginEmail" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-slate-600">
                        {student.admissionNumber || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/students/$studentId"
                        params={{ studentId: student.id }}
                        className="flex items-center gap-3 group"
                      >
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.name} className="size-8 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                          {student.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {student.className || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {student.gender || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.loginEmail ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-600 truncate max-w-[180px]">
                            {student.loginEmail}
                          </span>
                          <button
                            onClick={() => copyToClipboard(student.loginEmail!, `email-${student.id}`)}
                            className="text-slate-400 hover:text-teal-600 transition-colors flex-shrink-0"
                            title="Copy email"
                          >
                            {copiedField === `email-${student.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No login</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: student.id }}
                          className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                          View
                        </Link>
                        <span className="text-slate-200">|</span>
                        {student.userId ? (
                          <button
                            onClick={() => resetPasswordMutation.mutate({ userId: student.userId! })}
                            disabled={resetPasswordMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset
                          </button>
                        ) : (
                          <button
                            onClick={() => createCredentialsMutation.mutate({ studentId: student.id })}
                            disabled={createCredentialsMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50 transition-colors"
                            title="Create login credentials"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Create Login
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{sortedStudents.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{students.length}</span> students
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterClass('')
                  setFilterGender('')
                  setFilterHasLogin('')
                  setSearchQuery('')
                }}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
