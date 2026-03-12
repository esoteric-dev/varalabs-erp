import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Hexagon, Mail, Lock, ArrowRight, Eye, EyeOff,
  GraduationCap, BarChart3, Shield,
} from 'lucide-react'
import { loginUser, resolveOrg } from '../lib/queries/user'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { orgSlug } = Route.useRouteContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: orgInfo } = useQuery({
    queryKey: ['resolveOrg', orgSlug],
    queryFn: () => resolveOrg(orgSlug),
    enabled: !!orgSlug,
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)

    try {
      const { token, refreshToken } = await loginUser(email, password, orgSlug)
      localStorage.setItem('authToken', token)
      localStorage.setItem('refreshToken', refreshToken)
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  const displayName = orgInfo?.orgName ?? 'School Office'

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col overflow-x-hidden">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 md:px-10 lg:px-20 relative shadow-sm">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/15">
            <Hexagon className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">Synapse</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/welcome" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Support</a>
        </div>
        <Link to="/signup" className="hidden md:flex px-5 py-2.5 text-[13px] font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-sm">
          Get started
        </Link>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-teal-500/[0.04] rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-indigo-500/[0.04] rounded-full blur-3xl -z-10" />

        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          {/* Left side -- Hero */}
          <div className="hidden lg:flex flex-col gap-8 pr-10">
            {/* Illustration card */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              {/* Abstract dashboard illustration */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
              <div className="absolute inset-0 p-8 flex flex-col justify-center gap-6">
                {/* Mini dashboard mockup */}
                <div className="bg-white/[0.08] backdrop-blur-sm rounded-xl p-5 border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="h-2.5 w-24 bg-white/20 rounded" />
                      <div className="h-2 w-16 bg-white/10 rounded mt-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['2,847', '186', '99.9%'].map((v, i) => (
                      <div key={i} className="bg-white/[0.05] rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-white">{v}</div>
                        <div className="text-[10px] text-white/40 mt-1">{['Students', 'Staff', 'Uptime'][i]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end gap-1 h-16 px-1">
                    {[35, 52, 48, 70, 58, 82, 75, 90, 65, 78, 88, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-teal-500/60 to-teal-400/20 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom overlay text */}
              <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Trusted by 500+ Institutions
                </div>
                <p className="text-base font-medium opacity-90">Empowering modern schools with streamlined management.</p>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Welcome back to{' '}
                <span className="text-teal-600 relative inline-block">Synapse</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Sign in to access your institution's dashboard, manage operations, and stay informed.
              </p>
            </div>

            {/* Social proof */}
            <div className="flex gap-4 items-center text-sm font-medium text-slate-400">
              <div className="flex -space-x-2.5">
                {[
                  'bg-teal-500',
                  'bg-blue-500',
                  'bg-violet-500',
                  'bg-amber-500',
                ].map((bg, i) => (
                  <div key={i} className={`w-9 h-9 rounded-full border-2 border-white ${bg} flex items-center justify-center text-white text-xs font-bold`}>
                    {['S', 'A', 'T', 'P'][i]}
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+2k</div>
              </div>
              <p>Join 2,000+ administrators today.</p>
            </div>
          </div>

          {/* Right side -- Login Card */}
          <div className="w-full max-w-[480px] mx-auto lg:ml-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
              {/* Tab header */}
              <div className="grid grid-cols-2 border-b border-slate-100">
                <div className="py-4 text-center font-bold text-teal-600 relative text-sm">
                  Login
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-teal-500 rounded-t-full" />
                </div>
                <Link to="/signup" className="py-4 text-center font-bold text-slate-400 hover:text-slate-600 transition-colors relative text-sm group">
                  Sign Up
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-transparent group-hover:bg-slate-200 transition-all rounded-t-full" />
                </Link>
              </div>

              <div className="p-8 md:p-10 flex flex-col gap-6">
                <div className="text-center mb-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Sign in to your account</h3>
                  <p className="text-slate-500 text-sm">
                    {orgSlug ? `Access ${displayName}` : 'Access your institution dashboard'}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                        <Mail className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@school.edu"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1 mr-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                      <a href="#" className="text-[11px] font-semibold text-teal-600 hover:underline">Forgot?</a>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                        <Lock className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                  </button>
                </form>
 
              </div>

              {/* Bottom link */}
              {!orgSlug && (
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-teal-600 font-bold hover:underline">Sign up here</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-slate-400 text-xs">
        <p>&copy; 2026 Vara Labs. All rights reserved.</p>
      </footer>
    </div>
  )
}
