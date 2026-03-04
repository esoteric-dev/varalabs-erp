import {
  Users, CalendarCheck, IndianRupee, BookOpen,
  LayoutDashboard, Settings,
} from 'lucide-react'
import { DashboardNavbar } from './common/navbar'
import { ProfileCard } from './common/profile-card'
import { MenuCard } from './common/menu-card'

interface GeneralRoleDashboardProps {
  tenantId: string
}

export function GeneralRoleDashboard({ tenantId }: GeneralRoleDashboardProps) {
  return (
    <div>
      <DashboardNavbar title="Dashboard" subtitle="Welcome back" tenantId={tenantId} />

      {/* Profile + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <ProfileCard
          name="Staff User"
          role="general"
          email="staff@greenwood.edu"
        />
        <MenuCard
          to="/students"
          label="Students"
          description="Browse the student directory"
          icon={Users}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <MenuCard
          to="/attendance"
          label="Attendance"
          description="View attendance records"
          icon={CalendarCheck}
          color="text-green-500"
          bg="bg-green-50"
        />
        <MenuCard
          to="/plugins/payroll"
          label="Payroll"
          description="View payroll information"
          icon={IndianRupee}
          color="text-amber-500"
          bg="bg-amber-50"
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <LayoutDashboard className="w-6 h-6 text-blue-500" />
          </div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Quick Overview</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Access your most-used modules from the navigation sidebar or the quick links above.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-green-500" />
          </div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Resources</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Browse academic resources, notices, and school documents in the resource center.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <Settings className="w-6 h-6 text-purple-500" />
          </div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Settings</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Update your profile, notification preferences, and account settings.
          </p>
        </div>
      </div>
    </div>
  )
}
