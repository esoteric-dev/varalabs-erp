import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Hexagon, Mail, Lock, ArrowRight, Eye, EyeOff, User,
  GraduationCap, BarChart3, Shield, Sparkles, CheckCircle2,
} from 'lucide-react'
import { signupUser } from '../lib/queries/user'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setLoading(true)

    try {
      const result = await signupUser(name, email, password)
      localStorage.setItem('authToken', result.token)
      localStorage.setItem('refreshToken', result.refreshToken)
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      setLoading(false)
    }
  }

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
        <Link to="/login" className="hidden md:flex px-5 py-2.5 text-[13px] font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-sm">
          Log in
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
              <div className="absolute inset-0 p-8 flex flex-col justify-center gap-6">
                {/* Feature highlights */}
                <div className="space-y-3">
                  {[
                    { icon: <Sparkles className="w-4 h-4 text-teal-400" />, title: 'AI-Powered Insights', desc: 'Smart analytics for better decisions' },
                    { icon: <Shield className="w-4 h-4 text-blue-400" />, title: 'Enterprise Security', desc: 'Role-based access & audit trails' },
                    { icon: <BarChart3 className="w-4 h-4 text-violet-400" />, title: 'Real-time Dashboards', desc: 'Live data across all departments' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.08] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08] flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <div className="text-xs text-white/50">{item.desc}</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-teal-400/60 ml-auto flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Free for small teams
                </div>
                <p className="text-base font-medium opacity-90">Get your institution running on Synapse in minutes.</p>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Start managing your{' '}
                <span className="text-teal-600 relative inline-block">institution</span>{' '}
                with ease.
              </h1>
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Synapse streamlines administration, learning, and communication in one unified platform designed for modern educators.
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

          {/* Right side -- Signup Card */}
          <div className="w-full max-w-[480px] mx-auto lg:ml-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
              {/* Tab header */}
              <div className="grid grid-cols-2 border-b border-slate-100">
                <Link to="/login" className="py-4 text-center font-bold text-slate-400 hover:text-slate-600 transition-colors relative text-sm group">
                  Login
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-transparent group-hover:bg-slate-200 transition-all rounded-t-full" />
                </Link>
                <div className="py-4 text-center font-bold text-teal-600 relative text-sm">
                  Sign Up
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-teal-500 rounded-t-full" />
                </div>
              </div>

              <div className="p-8 md:p-10 flex flex-col gap-6">
                <div className="text-center mb-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h3>
                  <p className="text-slate-500 text-sm">Join your institution's digital ecosystem</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="flex flex-col gap-5">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                        <User className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Work Email</label>
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
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                        <Lock className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
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

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 mt-1">
                    <div className="flex h-6 items-center">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-teal-500 focus:ring-teal-500/50 transition-all cursor-pointer accent-teal-500"
                      />
                    </div>
                    <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="#" className="font-bold text-slate-900 hover:underline">Terms of Service</a>{' '}
                      and{' '}
                      <a href="#" className="font-bold text-slate-900 hover:underline">Privacy Policy</a>.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                  </button>
                </form>

              </div>

              {/* Bottom link */}
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-teal-600 font-bold hover:underline">Log in here</Link>
                </p>
              </div>
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
