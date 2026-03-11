import { Link } from '@tanstack/react-router'

const actions = [
  {
    to: '/students/add-student' as const,
    icon: 'person_add',
    label: 'Add Student',
    hoverBg: 'hover:bg-teal-50 hover:text-teal-700 hover:border-teal-100',
  },
  {
    to: '/notices' as const,
    icon: 'mail',
    label: 'Send SMS',
    hoverBg: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100',
  },
  {
    to: '/fees' as const,
    icon: 'receipt_long',
    label: 'Create Invoice',
    hoverBg: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-100',
  },
  {
    to: '/reports' as const,
    icon: 'upload_file',
    label: 'Upload Docs',
    hoverBg: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-100',
  },
]

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-slate-400 text-sm font-bold mb-4 uppercase tracking-wide">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 text-slate-600 transition-all border border-transparent ${action.hoverBg}`}
          >
            <span className="material-symbols-outlined text-2xl mb-1">{action.icon}</span>
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
