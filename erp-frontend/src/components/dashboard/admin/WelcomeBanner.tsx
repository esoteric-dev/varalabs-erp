import { Link } from '@tanstack/react-router'
import { User } from 'lucide-react'

interface WelcomeBannerProps {
  userName: string
  dataUpdatedAt: number
  latestActivity?: string
}

export function WelcomeBanner({ userName, dataUpdatedAt, latestActivity }: WelcomeBannerProps) {
  const updatedDate = dataUpdatedAt > 0
    ? new Date(dataUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 rounded-xl p-6 text-white">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-10" />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />
      <div className="absolute bottom-0 right-0 w-40 h-20 bg-white/5 rounded-tl-full" />

      {latestActivity && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-xs font-medium px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
            {latestActivity}
          </span>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome Back, {userName}</h2>
          <p className="text-teal-100 mt-1 text-sm">Have a Good day at work</p>
          {updatedDate && (
            <p className="text-teal-200/70 text-xs mt-2">Updated Recently on {updatedDate}</p>
          )}
        </div>
        <Link to="/settings" className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors">
          <User className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}
