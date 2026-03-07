import { Link } from '@tanstack/react-router'
import { UserPlus, IndianRupee } from 'lucide-react'

export function ActionBar() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        to="/students/add-student"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
      >
        <UserPlus className="w-4 h-4" />
        Add New Student
      </Link>
      <Link
        to="/fees"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <IndianRupee className="w-4 h-4" />
        Fees Details
      </Link>
    </div>
  )
}
