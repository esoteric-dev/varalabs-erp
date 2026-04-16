import { Link } from '@tanstack/react-router'
import {
  CalendarCheck, IndianRupee, BookOpen, Megaphone,
} from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { ProfileCard } from './common/profile-card'
import { MenuCard } from './common/menu-card'

const children = [
  { name: 'Aarav Sharma', id: 'stu-001', grade: '10-A', roll: 1, attendance: '96%', avgScore: '88.5%', rank: '#3' },
  { name: 'Anvi Sharma', id: 'stu-009', grade: '7-B', roll: 8, attendance: '93%', avgScore: '84.2%', rank: '#7' },
]

const feeStatus = [
  { child: 'Aarav Sharma', term: 'Term 3 (Jan-Mar)', amount: '₹45,000', status: 'Paid', dueDate: '15 Jan 2025' },
  { child: 'Anvi Sharma', term: 'Term 3 (Jan-Mar)', amount: '₹38,000', status: 'Pending', dueDate: '15 Jan 2025' },
  { child: 'Aarav Sharma', term: 'Transport Fee', amount: '₹8,000', status: 'Paid', dueDate: '1 Feb 2025' },
  { child: 'Anvi Sharma', term: 'Transport Fee', amount: '₹8,000', status: 'Paid', dueDate: '1 Feb 2025' },
]

const notices = [
  { title: 'Annual Day Rehearsal Schedule', date: '2 Mar 2025', type: 'event' },
  { title: 'Mid-Term Exam Timetable Released', date: '28 Feb 2025', type: 'exam' },
  { title: 'Parent-Teacher Meeting on 20 March', date: '25 Feb 2025', type: 'meeting' },
  { title: 'School closed on Holi (14 Mar)', date: '20 Feb 2025', type: 'holiday' },
]

interface ParentDashboardProps {
  tenantId: string
}

export function ParentDashboard({ tenantId }: ParentDashboardProps) {
  return (
    <div>
      <DashboardNavbar title="Parent Dashboard" subtitle="Welcome, Mr. Raj Sharma" tenantId={tenantId} />

      {/* Profile + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <ProfileCard
          name="Raj Sharma"
          role="parent"
          email="raj.sharma@gmail.com"
          phone="+91 98765 43210"
        />
        <MenuCard
          to="/attendance"
          label="Attendance"
          description="Track your children's attendance"
          icon={CalendarCheck}
          color="text-green-500"
          bg="bg-green-50"
        />
        <MenuCard
          to="/plugins/payroll"
          label="Fee Payments"
          description="View and pay pending school fees"
          icon={IndianRupee}
          color="text-amber-500"
          bg="bg-amber-50"
          count="₹38K due"
        />
        <MenuCard
          to="/students"
          label="Academic Reports"
          description="Download report cards and progress reports"
          icon={BookOpen}
          color="text-blue-500"
          bg="bg-blue-50"
        />
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {children.map((child) => (
          <Link
            key={child.id}
            to="/my-students"
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {child.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">{child.name}</h4>
                <p className="text-xs text-gray-500">Class {child.grade} &middot; Roll #{child.roll}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5">Attendance</p>
                <p className="text-sm font-bold text-green-600">{child.attendance}</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5">Avg Score</p>
                <p className="text-sm font-bold text-blue-600">{child.avgScore}</p>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5">Rank</p>
                <p className="text-sm font-bold text-amber-600">{child.rank}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Fee Status</h3>
            <span className="text-xs text-gray-400">2024-25</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Child</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {feeStatus.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{f.child}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-600">{f.term}</p>
                    <p className="text-xs text-gray-400">Due: {f.dueDate}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{f.amount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      f.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notices */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">School Notices</h3>
            <Megaphone className="w-4 h-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {notices.map((n, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    n.type === 'exam' ? 'bg-red-400' :
                    n.type === 'event' ? 'bg-purple-400' :
                    n.type === 'meeting' ? 'bg-blue-400' : 'bg-green-400'
                  }`} />
                  <div>
                    <p className="text-sm text-gray-700">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
