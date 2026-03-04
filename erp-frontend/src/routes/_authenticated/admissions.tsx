import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchAdmissions } from '../../lib/queries/admissions'
import type { AdmissionApplication } from '../../lib/queries/admissions'

export const Route = createFileRoute('/_authenticated/admissions')({
  component: AdmissionsPage,
})

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  waitlisted: 'bg-purple-50 text-purple-700',
}

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
}

function AdmissionsPage() {
  const { data: applications = [], isLoading } = useQuery<AdmissionApplication[]>({
    queryKey: ['admissions'],
    queryFn: fetchAdmissions,
  })

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admissions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage admission applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applications', value: stats.total, color: 'bg-teal-50 text-teal-600' },
          { label: 'New Submissions', value: stats.submitted, color: 'bg-blue-50 text-blue-600' },
          { label: 'Under Review', value: stats.underReview, color: 'bg-amber-50 text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'bg-green-50 text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Applications</h3>
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guardian</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                        {app.studentName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{app.studentName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{app.guardianName}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{app.guardianPhone}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{app.appliedClass}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{app.academicYear}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[app.status] || 'bg-gray-50 text-gray-600'}`}>
                      {statusLabels[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
