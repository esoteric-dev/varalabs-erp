import { Mail, Phone, Shield } from 'lucide-react'

interface ProfileCardProps {
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
}

export function ProfileCard({ name, role, email, phone }: ProfileCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('')
  const roleBadgeColors: Record<string, string> = {
    superadmin: 'bg-red-50 text-red-700',
    admin: 'bg-purple-50 text-purple-700',
    teacher: 'bg-blue-50 text-blue-700',
    student: 'bg-teal-50 text-teal-700',
    parent: 'bg-amber-50 text-amber-700',
  }
  const badgeColor = roleBadgeColors[role] ?? 'bg-gray-50 text-gray-700'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Shield className="w-3 h-3 text-gray-400" />
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${badgeColor}`}>
              {role}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate">{email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}
