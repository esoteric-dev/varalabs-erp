import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchStudent, updateStudent } from '../../../lib/queries/students'
import type { UpdateStudentInput } from '../../../lib/queries/students'
import { fetchAttendanceRecords } from '../../../lib/queries/attendance'
import { fetchFeeRecords } from '../../../lib/queries/fees'
import { fetchStudentMarks, fetchExams } from '../../../lib/queries/marks'
import { uploadStudentPhoto } from '../../../lib/queries/uploads'
import type { AttendanceRecord } from '../../../lib/queries/attendance'
import type { FeeRecord } from '../../../lib/queries/fees'
import type { StudentMark, Exam } from '../../../lib/queries/marks'
import { useMemo, useState, useRef } from 'react'
import { PhotoCropModal } from '../../../components/ui/PhotoCropModal'

export const Route = createFileRoute('/_authenticated/students/$studentId')({
  component: StudentProfile,
})

function formatPaise(paise: number): string {
  if (paise >= 10000000) return `\u20B9${(paise / 10000000).toFixed(1)}Cr`
  if (paise >= 100000) return `\u20B9${(paise / 100000).toFixed(1)}L`
  if (paise >= 1000) return `\u20B9${(paise / 1000).toFixed(1)}K`
  return `\u20B9${(paise / 100).toFixed(0)}`
}

const statusColor: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-700',
  late: 'bg-amber-50 text-amber-700',
  excused: 'bg-blue-50 text-blue-700',
}

const feeStatusColor: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  pending: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  waived: 'bg-gray-50 text-gray-600',
}

function StudentProfile() {
  const { studentId } = Route.useParams()
  const queryClient = useQueryClient()
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateStudentInput>({})

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => fetchStudent(studentId),
  })

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendanceRecords', 'student', studentId],
    queryFn: () => fetchAttendanceRecords(undefined, studentId),
  })

  const { data: feeRecords = [] } = useQuery<FeeRecord[]>({
    queryKey: ['feeRecords', studentId],
    queryFn: () => fetchFeeRecords(studentId),
  })

  const { data: marks = [] } = useQuery<StudentMark[]>({
    queryKey: ['studentMarks', studentId, selectedExamId || 'all'],
    queryFn: () => fetchStudentMarks(studentId, selectedExamId || undefined),
  })

  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ['exams', student?.className],
    queryFn: () => fetchExams(student?.className),
    enabled: !!student?.className,
  })

  const photoUploadMutation = useMutation({
    mutationFn: (blob: Blob) => uploadStudentPhoto(studentId, blob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setUploadError(null)
    },
    onError: (err: Error) => {
      setUploadError(err.message)
    },
  })

  const updateStudentMutation = useMutation({
    mutationFn: (fields: UpdateStudentInput) => updateStudent(studentId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setIsEditing(false)
    },
  })

  const startEditing = () => {
    if (!student) return
    setEditForm({
      name: student.name,
      className: student.className,
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || '',
      bloodGroup: student.bloodGroup || '',
      religion: student.religion || '',
      email: student.email || '',
      phone: student.phone || '',
      admissionNumber: student.admissionNumber || '',
      admissionDate: student.admissionDate || '',
    })
    setIsEditing(true)
  }

  const saveStudent = () => {
    const cleaned: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(editForm)) {
      cleaned[key] = value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
    }
    updateStudentMutation.mutate(cleaned)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }
    setUploadError(null)
    setCropFile(file)
    e.target.value = ''
  }

  // Attendance stats
  const totalAttendance = attendance.length
  const presentCount = attendance.filter(r => r.status === 'present').length
  const attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '-'

  // Fee stats
  const totalDue = feeRecords.reduce((sum, r) => sum + r.amountDue, 0)
  const totalPaid = feeRecords.reduce((sum, r) => sum + r.amountPaid, 0)
  const pendingAmount = totalDue - totalPaid

  // Marks stats
  const overallAvg = useMemo(() => {
    if (marks.length === 0) return null
    const totalObtained = marks.reduce((s, m) => s + m.marksObtained, 0)
    const totalMax = marks.reduce((s, m) => s + m.totalMarks, 0)
    return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0
  }, [marks])

  const initials = student?.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || ''

  if (loadingStudent) {
    return (
      <div className="space-y-6">
        <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-xl relative overflow-hidden shadow-md">
          <div className="relative z-10 px-8 pt-8 pb-24">
            <div className="flex items-center gap-2 text-blue-50 text-sm mb-2">
              <Link to="/students" className="hover:text-white transition-colors">Students</Link>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-white font-medium">Loading...</span>
            </div>
          </div>
        </div>
        <div className="py-8 text-center text-sm text-slate-400">Loading student profile...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-xl relative overflow-hidden shadow-md">
          <div className="relative z-10 px-8 pt-8 pb-24">
            <div className="flex items-center gap-2 text-blue-50 text-sm mb-2">
              <Link to="/students" className="hover:text-white transition-colors">Students</Link>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-white font-medium">Not Found</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Student Not Found</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 -mt-20 relative z-20 mx-4 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">person_off</span>
          <p className="text-sm text-slate-400">This student record could not be found.</p>
          <Link to="/students" className="inline-flex items-center gap-1.5 mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-xl relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-5 rounded-full" />

        <div className="relative z-10 px-8 pt-8 pb-24">
          <div className="flex items-center gap-2 text-blue-50 text-sm mb-2">
            <Link to="/students" className="hover:text-white transition-colors">Students</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-white font-medium">{student.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Student Profile</h1>
        </div>
      </div>

      {/* Profile Card - Overlapping the banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 -mt-20 relative z-20 mx-4">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="size-24 md:size-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="size-24 md:size-28 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-4 border-white shadow-lg">
                  {initials}
                </div>
              )}
              <div className="absolute bottom-1 right-1 size-5 rounded-full bg-green-500 border-3 border-white" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploadMutation.isPending}
                className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-white text-2xl drop-shadow">
                  {photoUploadMutation.isPending ? 'hourglass_empty' : 'photo_camera'}
                </span>
              </button>
            </div>

            {/* Name & Quick Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 truncate">{student.name}</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                  Class {student.className}
                </span>
                {overallAvg !== null && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    overallAvg >= 80 ? 'bg-green-50 text-green-700' :
                    overallAvg >= 60 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {overallAvg}% avg
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-3">
                {student.admissionNumber && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-blue-500">confirmation_number</span>
                    <span className="font-semibold text-blue-700">{student.admissionNumber}</span>
                  </div>
                )}
                {student.email && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-slate-400">mail</span>
                    {student.email}
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-slate-400">phone</span>
                    {student.phone}
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-xs text-rose-500 mt-2">{uploadError}</p>
              )}
              {photoUploadMutation.isSuccess && (
                <p className="text-xs text-emerald-600 mt-2">Photo uploaded successfully</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="calendar_month" iconBg="bg-green-50" iconColor="text-green-500" label="Attendance" value={`${attendanceRate}%`} />
        <StatCard icon="event_available" iconBg="bg-blue-50" iconColor="text-blue-500" label="Days Recorded" value={`${totalAttendance}`} />
        <StatCard icon="currency_rupee" iconBg="bg-teal-50" iconColor="text-teal-500" label="Fees Paid" value={formatPaise(totalPaid)} />
        <StatCard icon="pending" iconBg="bg-amber-50" iconColor="text-amber-500" label="Pending" value={formatPaise(pendingAmount)} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Academic Marks */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">school</span>
                <h3 className="text-lg font-bold text-slate-900">Academic Marks</h3>
              </div>
              {exams.length > 0 && (
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Exams</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              )}
            </div>
            {marks.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">quiz</span>
                <p className="text-sm text-slate-400">No marks recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                      {!selectedExamId && <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Exam</th>}
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Marks</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">%</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {marks.map(m => {
                      const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0
                      const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F'
                      const gradeColor = pct >= 80 ? 'bg-green-50 text-green-700' : pct >= 60 ? 'bg-blue-50 text-blue-700' : pct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{m.subjectName}</td>
                          {!selectedExamId && <td className="px-6 py-3.5 text-sm text-slate-600">{m.examName || '-'}</td>}
                          <td className="px-6 py-3.5 text-sm text-slate-700">{m.marksObtained} / {m.totalMarks}</td>
                          <td className="px-6 py-3.5 text-sm font-semibold text-slate-800">{pct}%</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full ${gradeColor}`}>{grade}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fee Records */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">payments</span>
              <h3 className="text-lg font-bold text-slate-900">Fee Records</h3>
            </div>
            {feeRecords.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">account_balance_wallet</span>
                <p className="text-sm text-slate-400">No fee records</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Fee</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Due</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feeRecords.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="text-sm font-medium text-slate-800">{f.feeName}</div>
                          <div className="text-xs text-slate-400">Due: {f.dueDate}</div>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-600">{formatPaise(f.amountDue)}</td>
                        <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{formatPaise(f.amountPaid)}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${feeStatusColor[f.status] || 'bg-slate-50 text-slate-600'}`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">calendar_month</span>
                <h3 className="text-lg font-bold text-slate-900">Attendance History</h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                {totalAttendance} records
              </span>
            </div>
            {attendance.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">event_busy</span>
                <p className="text-sm text-slate-400">No attendance records</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-slate-700">{a.date}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${statusColor[a.status] || 'bg-slate-50 text-slate-600'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-500">{a.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Student Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">person</span>
                <h3 className="text-lg font-bold text-slate-900">Student Details</h3>
              </div>
              {!isEditing && (
                <button onClick={startEditing} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="p-6 space-y-3">
                <EditField label="Full Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                <EditField label="Class" value={editForm.className} onChange={(v) => setEditForm({ ...editForm, className: v })} />
                <EditField label="Admission No." value={editForm.admissionNumber} onChange={(v) => setEditForm({ ...editForm, admissionNumber: v })} />
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <EditField label="Date of Birth" value={editForm.dateOfBirth} onChange={(v) => setEditForm({ ...editForm, dateOfBirth: v })} type="date" />
                <EditField label="Blood Group" value={editForm.bloodGroup} onChange={(v) => setEditForm({ ...editForm, bloodGroup: v })} />
                <EditField label="Religion" value={editForm.religion} onChange={(v) => setEditForm({ ...editForm, religion: v })} />
                <EditField label="Admission Date" value={editForm.admissionDate} onChange={(v) => setEditForm({ ...editForm, admissionDate: v })} type="date" />
                <EditField label="Email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" />
                <EditField label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} type="tel" />

                <div className="flex gap-2 pt-2">
                  <button onClick={saveStudent} disabled={updateStudentMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {updateStudentMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
                {updateStudentMutation.isError && (
                  <p className="text-xs text-rose-500">{(updateStudentMutation.error as Error).message}</p>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <DetailField icon="badge" label="Full Name" value={student.name} />
                <DetailField icon="class" label="Class" value={student.className} />
                {student.admissionNumber && (
                  <DetailField icon="confirmation_number" label="Admission No." value={student.admissionNumber} highlight />
                )}
                {student.gender && (
                  <DetailField icon="wc" label="Gender" value={student.gender} capitalize />
                )}
                {student.dateOfBirth && (
                  <DetailField icon="cake" label="Date of Birth" value={student.dateOfBirth} />
                )}
                {student.bloodGroup && (
                  <DetailField icon="bloodtype" label="Blood Group" value={student.bloodGroup} />
                )}
                {student.religion && (
                  <DetailField icon="church" label="Religion" value={student.religion} capitalize />
                )}
                {student.admissionDate && (
                  <DetailField icon="event" label="Admission Date" value={student.admissionDate} />
                )}
                {student.email && (
                  <DetailField icon="mail" label="Email" value={student.email} />
                )}
                {student.phone && (
                  <DetailField icon="phone" label="Phone" value={student.phone} />
                )}
                {student.loginEmail && (
                  <DetailField icon="alternate_email" label="Login Email" value={student.loginEmail} />
                )}
              </div>
            )}
          </div>

          {/* ID Card */}
          {student.admissionNumber && (
            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">id_card</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">Student ID</h3>
                </div>
                <p className="text-2xl font-bold tracking-wide mb-3">{student.admissionNumber}</p>
                <p className="text-sm opacity-80 font-medium">{student.name}</p>
                <p className="text-xs opacity-60 mt-1">Class {student.className}</p>
              </div>
            </div>
          )}

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">insights</span>
              <h3 className="text-lg font-bold text-slate-900">Quick Summary</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Attendance Rate</p>
                  <p className="text-xs text-slate-400">{presentCount} present out of {totalAttendance} days</p>
                </div>
                <span className="text-lg font-bold text-green-700">{attendanceRate}%</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="material-symbols-outlined text-blue-600">school</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Academic Average</p>
                  <p className="text-xs text-slate-400">{marks.length} subjects recorded</p>
                </div>
                <span className="text-lg font-bold text-blue-700">{overallAvg !== null ? `${overallAvg}%` : '-'}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <span className="material-symbols-outlined text-teal-600">payments</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Fees Status</p>
                  <p className="text-xs text-slate-400">{formatPaise(totalPaid)} paid of {formatPaise(totalDue)}</p>
                </div>
                {pendingAmount > 0 ? (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{formatPaise(pendingAmount)} due</span>
                ) : (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Cleared</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onSave={blob => { setCropFile(null); photoUploadMutation.mutate(blob) }}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value }: {
  icon: string; iconBg: string; iconColor: string; label: string; value: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function DetailField({ icon, label, value, capitalize = false, highlight = false }: {
  icon: string; label: string; value: string; capitalize?: boolean; highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 border ${
        highlight ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
      }`}>
        <span className={`material-symbols-outlined text-base ${highlight ? 'text-blue-500' : 'text-slate-400'}`}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm font-semibold truncate ${
          highlight ? 'text-blue-700' : 'text-slate-900'
        } ${capitalize ? 'capitalize' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
