import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Palette, Zap, Users, Settings, Play, Hexagon,
  Facebook, Twitter, Linkedin, Instagram, ArrowRight,
  Shield, BarChart3, BookOpen, GraduationCap, ClipboardCheck,
  Monitor, Smartphone, Star, Sparkles,
  Check, Globe, Lock, Layers,
} from 'lucide-react'

export const Route = createFileRoute('/welcome')({
  component: WelcomePage,
})

/* ── Persona content for Solutions tabs ──────────────────────────────── */
const personaContent: Record<string, {
  title: string; subtitle: string; bullets: string[];
  mockLabel: string; mockSublabel: string;
  icon: typeof Monitor; color: string;
}> = {
  Office: {
    title: 'Admin Command Center',
    subtitle: 'Desktop-first, comprehensive administrative tools for full institutional control.',
    bullets: ['Real-time enrollment dashboards', 'Fee collection & reconciliation', 'Staff payroll automation', 'Academic calendar management'],
    mockLabel: 'Dashboard', mockSublabel: 'Analytics & Reports',
    icon: Monitor, color: 'from-teal-500 to-emerald-500',
  },
  Teacher: {
    title: 'Teacher Toolkit',
    subtitle: 'Mobile-first, effortless attendance & grading experience.',
    bullets: ['One-tap digital attendance', 'Gradebook with auto-calculation', 'Lesson plan management', 'Parent communication hub'],
    mockLabel: 'Attendance', mockSublabel: 'Gradebook',
    icon: BookOpen, color: 'from-blue-500 to-indigo-500',
  },
  Student: {
    title: 'Student Portal',
    subtitle: 'Self-serve academic & campus tools for modern learners.',
    bullets: ['Assignment submissions', 'Live class schedules', 'Performance analytics', 'Digital library access'],
    mockLabel: 'Assignments', mockSublabel: 'Schedule',
    icon: GraduationCap, color: 'from-violet-500 to-purple-500',
  },
  Guardian: {
    title: 'Parent Connect',
    subtitle: 'Stay informed, stay involved in your child\'s journey.',
    bullets: ['Live attendance alerts', 'Fee payment gateway', 'Direct teacher messaging', 'Progress report access'],
    mockLabel: 'Notifications', mockSublabel: 'Fee Portal',
    icon: Shield, color: 'from-amber-500 to-orange-500',
  },
}

const features = [
  { icon: <Palette className="w-5 h-5" />, title: 'Dynamic Branding', desc: "Instantly apply your school's colors and logo across the entire platform.", color: 'from-teal-500 to-emerald-500', borderColor: 'hover:border-teal-500/40' },
  { icon: <Zap className="w-5 h-5" />, title: 'Optimistic UI', desc: 'Experience a lightning-fast interface with zero-latency data updates.', color: 'from-amber-500 to-orange-500', borderColor: 'hover:border-amber-500/40' },
  { icon: <Users className="w-5 h-5" />, title: 'Multi-Tenant Architecture', desc: 'Secure, isolated data environments for every institution on a shared codebase.', color: 'from-blue-500 to-indigo-500', borderColor: 'hover:border-blue-500/40' },
  { icon: <Settings className="w-5 h-5" />, title: 'Autonomous Workflows', desc: 'Automate administrative tasks, scheduling, and reporting end-to-end.', color: 'from-violet-500 to-purple-500', borderColor: 'hover:border-violet-500/40' },
  { icon: <Shield className="w-5 h-5" />, title: 'Enterprise Security', desc: 'Role-based access control, audit logs, and encryption at every layer.', color: 'from-rose-500 to-pink-500', borderColor: 'hover:border-rose-500/40' },
  { icon: <BarChart3 className="w-5 h-5" />, title: 'Analytics & Insights', desc: 'Actionable intelligence from attendance trends to financial projections.', color: 'from-cyan-500 to-teal-500', borderColor: 'hover:border-cyan-500/40' },
]

const trustedSchools = ['Greenwood Academy', "St. Mary's School", 'Oakridge International', 'Delhi Public School', 'Ryan International', 'Amity Global', 'Springdale School', 'Modern High']

/* ── Animated counter hook ───────────────────────────────────────────── */
function useCountUp(target: number, suffix = '', duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = performance.now()
          const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { ref, display: `${count.toLocaleString()}${suffix}` }
}

/* ── Main Page Component ─────────────────────────────────────────────── */
function WelcomePage() {
  const [activeTab, setActiveTab] = useState('Office')
  const active = personaContent[activeTab]
  const TabIcon = active.icon

  const stat1 = useCountUp(500, '+')
  const stat2 = useCountUp(2, 'M+', 1500)
  const stat3 = useCountUp(99, '.9%', 2500)

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-teal-500/30 relative overflow-hidden">

      {/* ═══ NAVBAR ═══════════════════════════════════════════════════════ */}
      <nav className="glass-dark sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-6 md:px-8 py-4 max-w-[1240px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Synapse</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#stats" className="hover:text-white transition-colors">Why Us</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/[0.07] rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.06] rounded-full blur-[100px] animate-float-reverse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[140px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-[1240px] mx-auto px-6 md:px-8 pt-20 md:pt-28 pb-20 md:pb-32">
          <div className="flex flex-col items-center text-center gap-6">
            {/* Badge */}
            <div className="animate-fade-in-up opacity-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-teal-400 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Now with AI-powered insights
                <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>

            {/* Headline */}
            <div className="animate-fade-in-up opacity-0 animation-delay-100">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-extrabold leading-[1.06] tracking-tight max-w-4xl mx-auto">
                The Modern{' '}
                <span className="text-gradient bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 animate-gradient">
                  Operating System
                </span>{' '}
                for Schools
              </h1>
            </div>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl animate-fade-in-up opacity-0 animation-delay-200">
              Empower administrators, teachers, students, and guardians with an intuitive, cloud-first ERP designed for the future of education.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 animate-fade-in-up opacity-0 animation-delay-300">
              <Link to="/signup" className="group relative px-8 py-4 text-sm font-semibold rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 active:translate-y-0">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl" />
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <span className="relative flex items-center gap-2 text-white">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:bg-white/[0.1] group-hover:border-white/[0.15] transition-all">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>
          </div>

          {/* ── Dashboard Mockup ──────────────────────────────────────── */}
          <div className="relative mt-16 md:mt-20 max-w-4xl mx-auto animate-scale-in opacity-0 animation-delay-500">
            {/* Glow behind mockup */}
            <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-emerald-500/15 to-cyan-500/20 rounded-3xl blur-3xl" />
            <div className="absolute -inset-[1px] bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent rounded-2xl" />
            
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/40 perspective-card">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-800/60 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-12">
                  <div className="w-64 h-6 bg-slate-700/60 rounded-lg mx-auto flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> school.synapse.edu</span>
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 md:p-6 grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-4">
                  {/* Header skeleton */}
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-40 bg-slate-800 rounded" />
                    <div className="h-5 w-20 bg-teal-500/10 border border-teal-500/20 rounded-full ml-auto" />
                  </div>
                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Students', value: '2,847', color: 'bg-teal-500', glow: 'shadow-teal-500/10' },
                      { label: 'Staff', value: '186', color: 'bg-blue-500', glow: 'shadow-blue-500/10' },
                      { label: 'Revenue', value: '₹1.4Cr', color: 'bg-violet-500', glow: 'shadow-violet-500/10' },
                    ].map((stat) => (
                      <div key={stat.label} className={`bg-slate-800/40 border border-white/[0.04] rounded-xl p-4 space-y-2.5 shadow-lg ${stat.glow}`}>
                        <div className="text-[11px] text-slate-500 font-medium">{stat.label}</div>
                        <div className="text-lg font-bold text-white">{stat.value}</div>
                        <div className="h-1.5 w-full rounded-full bg-slate-700/60">
                          <div className={`h-1.5 rounded-full ${stat.color}`} style={{ width: `${70 + Math.random() * 20}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chart placeholder */}
                  <div className="h-28 bg-gradient-to-r from-teal-500/[0.06] to-cyan-500/[0.06] rounded-xl border border-teal-500/10 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-teal-700" />
                  </div>
                </div>
                {/* Sidebar skeleton */}
                <div className="space-y-3">
                  <div className="h-5 w-20 bg-slate-800 rounded" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-slate-800/30 border border-white/[0.03] rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-full bg-slate-700/50 rounded" />
                        <div className="h-1.5 w-2/3 bg-slate-700/30 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TRUSTED BY ═══════════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.04] bg-slate-900/30">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-8 flex flex-col items-center gap-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Trusted by leading institutions</span>
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10" />
            <div className="flex animate-scroll-x gap-12 w-max">
              {[...trustedSchools, ...trustedSchools].map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-2.5 text-sm font-semibold text-slate-500 whitespace-nowrap">
                  <Hexagon className="w-4 h-4 text-slate-600" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═════════════════════════════════════════════ */}
      <section id="features" className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />
        <div className="relative max-w-[1240px] mx-auto px-6 md:px-8 py-24 md:py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-semibold text-emerald-400 mb-6">
              <Layers className="w-3.5 h-3.5" />
              Platform Capabilities
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 tracking-tight">
              Everything you need,{' '}
              <span className="text-gradient bg-gradient-to-r from-slate-400 to-slate-300">nothing you don't</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Built from the ground up for modern educational institutions, with powerful features that just work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`group relative p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl ${feature.borderColor} hover:bg-white/[0.04] transition-all duration-500 animate-fade-in-up opacity-0`}
                style={{ animationDelay: `${idx * 100 + 200}ms` }}
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 text-white shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUTIONS / PERSONAS SECTION ═════════════════════════════════ */}
      <section id="solutions" className="relative border-y border-white/[0.04]">
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative max-w-[1240px] mx-auto px-6 md:px-8 py-24 md:py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-semibold text-blue-400 mb-6">
              <Users className="w-3.5 h-3.5" />
              Role-Based Experience
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 tracking-tight">
              Built for{' '}
              <span className="text-gradient bg-gradient-to-r from-teal-400 to-cyan-400">every role</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Whether you're an admin, teacher, student, or parent — Synapse adapts to the way you work.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Tab bar */}
            <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 mb-8 overflow-x-auto">
              {(Object.keys(personaContent) as Array<keyof typeof personaContent>).map((tab) => {
                const Icon = personaContent[tab].icon
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-400 border border-teal-500/20 shadow-sm shadow-teal-500/5'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Panel */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden" key={activeTab}>
              <div className="p-8 md:p-10 animate-slide-in-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  {/* Text side */}
                  <div>
                    <div className={`inline-flex w-12 h-12 rounded-xl bg-gradient-to-br ${active.color} items-center justify-center mb-5 text-white shadow-lg`}>
                      <TabIcon className="w-5 h-5" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2">{active.title}</h4>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">{active.subtitle}</p>
                    <ul className="space-y-3">
                      {active.bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-teal-400" />
                          </div>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mock screens */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-white/[0.06] rounded-xl h-48 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-slate-500" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{active.mockLabel}</span>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-white/[0.06] rounded-xl h-48 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-slate-500" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{active.mockSublabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS SECTION ════════════════════════════════════════════════ */}
      <section id="stats" className="relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/[0.04] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-[1240px] mx-auto px-6 md:px-8 py-24 md:py-32">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { ...stat1, label: 'Schools Onboarded', icon: <GraduationCap className="w-6 h-6" />, color: 'from-teal-500 to-emerald-500' },
              { ...stat2, label: 'Students Managed', icon: <Globe className="w-6 h-6" />, color: 'from-blue-500 to-indigo-500' },
              { ...stat3, label: 'Platform Uptime', icon: <ClipboardCheck className="w-6 h-6" />, color: 'from-violet-500 to-purple-500' },
            ].map((stat) => (
              <div
                key={stat.label}
                ref={stat.ref}
                className="flex flex-col items-center gap-4 p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{stat.display}</span>
                <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ══════════════════════════════════════════════════ */}
      <section className="max-w-[1240px] mx-auto px-6 md:px-8 pb-24 md:pb-32">
        <div className="relative overflow-hidden rounded-3xl">
          {/* Animated gradient border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/30 via-emerald-500/30 to-cyan-500/30 rounded-3xl shimmer-border" />
          
          <div className="relative bg-slate-900 rounded-3xl overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.06] via-transparent to-violet-500/[0.06]" />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full border border-white/[0.04]" />
            <div className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full border border-white/[0.04]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/[0.04] blur-[100px]" />

            <div className="relative z-10 py-20 md:py-24 px-8 flex flex-col items-center text-center gap-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight max-w-xl tracking-tight">
                Ready to Transform Your Institution?
              </h3>
              <p className="text-slate-400 text-base max-w-lg leading-relaxed">
                Set up your school in minutes with your own branded subdomain. No credit card required.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                <Link to="/signup" className="group px-8 py-4 text-sm font-semibold text-slate-900 bg-white rounded-xl hover:bg-teal-50 hover:text-teal-700 transition-all hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/login" className="px-8 py-4 text-sm font-semibold text-white border border-white/[0.15] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.25] transition-all">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-slate-900/20">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Hexagon className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Synapse</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                The modern operating system for schools. Built for the future of education.
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Integrations', 'Changelog'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-teal-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Careers', 'Contact'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-teal-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-teal-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.04]">
            <p className="text-xs text-slate-600">&copy; 2026 Vara Labs. All rights reserved.</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-teal-400 hover:border-teal-500/30 hover:bg-teal-500/[0.06] transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
