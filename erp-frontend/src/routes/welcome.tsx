import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Zap, Users, ArrowRight, Hexagon,
  Shield, BarChart3, BookOpen, GraduationCap,
  Monitor, Star, Sparkles,
  Check, Globe, Lock, Layers, ChevronRight,
  Menu, X, Play, Clock, Bell,
  FileText, Calendar, TrendingUp, Award,
  Building2, Heart, Workflow, Eye,
} from 'lucide-react'

export const Route = createFileRoute('/welcome')({
  component: WelcomePage,
})

/* ── Intersection observer hook for section reveals ─────────────────── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}

/* ── Animated counter hook ──────────────────────────────────────────── */
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
            const eased = 1 - Math.pow(1 - progress, 3)
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

/* ── Data ────────────────────────────────────────────────────────────── */
const trustedSchools = [
  'Greenwood Academy',
  "St. Mary's School",
  'Oakridge International',
  'Delhi Public School',
  'Ryan International',
  'Amity Global',
  'Springdale School',
  'Modern High',
]

const features = [
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Multi-Tenant Architecture',
    desc: 'Each institution gets a fully isolated, branded subdomain with dedicated data environments.',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    tag: 'Infrastructure',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Optimistic UI',
    desc: 'Instant, zero-latency interface. Every action feels immediate with smart local state.',
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    tag: 'Performance',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Enterprise Security',
    desc: 'Role-based access control, complete audit trails, and end-to-end encryption.',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    tag: 'Security',
  },
  {
    icon: <Workflow className="w-5 h-5" />,
    title: 'Autonomous Workflows',
    desc: 'Automate admissions, fee reminders, report cards, and attendance tracking.',
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
    tag: 'Automation',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Real-time Analytics',
    desc: 'From attendance trends to financial projections, make data-driven decisions.',
    color: 'from-cyan-500 to-blue-500',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    tag: 'Insights',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: 'Dynamic Branding',
    desc: 'Your colors, your logo, your identity -- applied across the entire platform.',
    color: 'from-rose-500 to-pink-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
    tag: 'Customization',
  },
]

const personas = [
  {
    key: 'admin',
    label: 'Admins',
    icon: <Building2 className="w-4 h-4" />,
    title: 'Command Center for Administration',
    desc: 'Full institutional oversight with real-time dashboards, fee management, staff payroll, and academic calendar -- all in one place.',
    bullets: ['Live enrollment & attendance dashboards', 'Fee collection & automated reconciliation', 'Staff payroll with tax computation', 'Academic calendar & exam scheduling'],
    color: 'from-teal-500 to-emerald-500',
    screens: ['Dashboard', 'Finance'],
    screenIcons: [<Monitor key="m" className="w-6 h-6 text-slate-400" />, <TrendingUp key="t" className="w-6 h-6 text-slate-400" />],
  },
  {
    key: 'teacher',
    label: 'Teachers',
    icon: <BookOpen className="w-4 h-4" />,
    title: 'Everything a Teacher Needs',
    desc: 'Mark attendance in one tap, manage gradebooks, plan lessons, and communicate with parents -- right from your phone.',
    bullets: ['One-tap digital attendance marking', 'Gradebook with auto-calculation', 'Assignment creation & submission tracking', 'Direct parent communication channel'],
    color: 'from-blue-500 to-indigo-500',
    screens: ['Attendance', 'Gradebook'],
    screenIcons: [<FileText key="f" className="w-6 h-6 text-slate-400" />, <Award key="a" className="w-6 h-6 text-slate-400" />],
  },
  {
    key: 'student',
    label: 'Students',
    icon: <GraduationCap className="w-4 h-4" />,
    title: 'Student Portal, Reimagined',
    desc: 'Submit assignments, check schedules, track performance, and access resources -- a self-serve academic toolkit.',
    bullets: ['Submit assignments & view grades', 'Live class schedule & timetable', 'Performance analytics & insights', 'Digital resource & library access'],
    color: 'from-violet-500 to-purple-500',
    screens: ['Assignments', 'Schedule'],
    screenIcons: [<Calendar key="c" className="w-6 h-6 text-slate-400" />, <Clock key="cl" className="w-6 h-6 text-slate-400" />],
  },
  {
    key: 'parent',
    label: 'Parents',
    icon: <Heart className="w-4 h-4" />,
    title: 'Stay Connected, Stay Informed',
    desc: "Real-time attendance alerts, fee payments, direct teacher messaging, and progress reports -- everything about your child's journey.",
    bullets: ['Instant attendance & absence alerts', 'Online fee payment gateway', 'Direct messaging with teachers', 'Progress reports & performance tracking'],
    color: 'from-amber-500 to-orange-500',
    screens: ['Alerts', 'Payments'],
    screenIcons: [<Bell key="b" className="w-6 h-6 text-slate-400" />, <Globe key="g" className="w-6 h-6 text-slate-400" />],
  },
]

const statsData = [
  { value: 500, suffix: '+', label: 'Schools Onboarded', icon: <GraduationCap className="w-5 h-5" /> },
  { value: 2, suffix: 'M+', label: 'Students Managed', icon: <Users className="w-5 h-5" /> },
  { value: 99, suffix: '.9%', label: 'Platform Uptime', icon: <Globe className="w-5 h-5" /> },
]

/* ── Bento Feature Card ─────────────────────────────────────────────── */
function BentoCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const isWide = index === 0 || index === 3
  return (
    <div
      className={`group relative bento-card bg-white border border-slate-200/80 rounded-2xl p-7 ${isWide ? 'sm:col-span-2' : ''} hover:border-slate-300 animate-fade-in-up opacity-0`}
      style={{ animationDelay: `${index * 80 + 200}ms` }}
    >
      <div className="relative flex flex-col h-full">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-md shadow-black/5`}>
            {feature.icon}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${feature.textColor}`}>{feature.tag}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────────────── */
function StatCard({ value, suffix, label, icon, index }: typeof statsData[0] & { index: number }) {
  const counter = useCountUp(value, suffix, 1800 + index * 400)
  return (
    <div
      ref={counter.ref}
      className="flex flex-col items-center gap-3 p-8 md:p-10 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-all duration-300 hover:shadow-lg hover:shadow-slate-100"
    >
      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
        {icon}
      </div>
      <span className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight stat-glow">{counter.display}</span>
      <span className="text-sm text-slate-400 font-medium">{label}</span>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────── */
function WelcomePage() {
  const [activePersona, setActivePersona] = useState('admin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const persona = personas.find((p) => p.key === activePersona)!

  const featuresRef = useReveal<HTMLElement>()
  const personaRef = useReveal<HTMLElement>()
  const statsRef = useReveal<HTMLElement>()
  const ctaRef = useReveal<HTMLElement>()

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-teal-500/20 relative overflow-x-hidden">

      {/* ═══ NAVBAR ═══ */}
      <nav className="glass-nav sticky top-0 z-50 border-b border-slate-200/60">
        <div className="flex items-center justify-between px-5 md:px-8 py-3 max-w-[1200px] mx-auto">
          {/* Logo */}
          <Link to="/welcome" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/15">
              <Hexagon className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Synapse</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#solutions" className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Solutions</a>
            <a href="#stats" className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Why Synapse</a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="px-5 py-2.5 text-[13px] font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all hover:-translate-y-px active:translate-y-0 shadow-sm">
              Get Synapse free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/60 px-5 py-4 space-y-3 bg-white animate-fade-in">
            <a href="#features" className="block text-sm text-slate-600 hover:text-slate-900 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#solutions" className="block text-sm text-slate-600 hover:text-slate-900 py-2" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
            <a href="#stats" className="block text-sm text-slate-600 hover:text-slate-900 py-2" onClick={() => setMobileMenuOpen(false)}>Why Synapse</a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" className="text-sm text-slate-600 py-2">Log in</Link>
              <Link to="/signup" className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full text-center">Get Synapse free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Soft ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-[140px] animate-float" />
          <div className="absolute bottom-[-5%] right-[10%] w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px] animate-float-reverse" />
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-emerald-100/20 rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-20 md:pt-32 pb-12 md:pb-20">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="animate-fade-in-up opacity-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200/60 text-xs font-semibold text-teal-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Now with AI-powered insights</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Headline */}
            <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.04] tracking-[-0.03em] max-w-[780px] text-slate-900 animate-fade-in-up opacity-0 animation-delay-100">
              One platform.{' '}
              <span className="text-gradient bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 animate-gradient">
                Zero chaos.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg md:text-xl text-slate-500 leading-relaxed max-w-[560px] animate-fade-in-up opacity-0 animation-delay-200">
              The modern ERP that lets administrators, teachers, students, and parents work together -- so a team of 5 feels like 50.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up opacity-0 animation-delay-300">
              <Link
                to="/signup"
                className="group px-8 py-4 text-sm font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-slate-900/10 shine-btn flex items-center gap-2"
              >
                Get Synapse free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 group-hover:shadow-md transition-all group-hover:scale-105 shadow-sm">
                  <Play className="w-4 h-4 ml-0.5 text-teal-600" />
                </div>
                Watch demo
              </button>
            </div>
          </div>

          {/* ── Dashboard Mockup ── */}
          <div className="relative mt-16 md:mt-24 max-w-[900px] mx-auto animate-scale-in opacity-0 animation-delay-500">
            {/* Subtle glow */}
            <div className="absolute -inset-8 bg-gradient-to-r from-teal-200/20 via-emerald-200/15 to-cyan-200/20 rounded-3xl blur-3xl" />

            <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/[0.07] border border-slate-200/80 perspective-card">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 mx-16">
                  <div className="w-56 h-6 bg-slate-100 rounded-md mx-auto flex items-center justify-center gap-1.5">
                    <Lock className="w-2.5 h-2.5 text-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-medium">school.synapse.edu</span>
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 md:p-6 grid grid-cols-12 gap-4 bg-[#f8f9fa]">
                {/* Main panel */}
                <div className="col-span-12 md:col-span-8 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-200/50 flex items-center justify-center">
                        <Hexagon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <div className="h-3.5 w-28 bg-slate-200 rounded" />
                        <div className="h-2 w-20 bg-slate-100 rounded mt-1.5" />
                      </div>
                    </div>
                    <div className="h-7 w-24 bg-teal-50 border border-teal-200/50 rounded-full" />
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Students', value: '2,847', bar: 85, accent: 'bg-teal-500' },
                      { label: 'Active Staff', value: '186', bar: 72, accent: 'bg-blue-500' },
                      { label: 'Revenue (MTD)', value: '₹14.2L', bar: 68, accent: 'bg-violet-500' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2 shadow-sm">
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{s.label}</div>
                        <div className="text-lg font-bold text-slate-900">{s.value}</div>
                        <div className="h-1 w-full rounded-full bg-slate-100">
                          <div className={`h-1 rounded-full ${s.accent}`} style={{ width: `${s.bar}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="h-32 bg-white rounded-xl border border-slate-100 flex items-end justify-center gap-1.5 p-4 pb-5 shadow-sm">
                    {[35, 52, 48, 70, 58, 82, 75, 90, 65, 78, 88, 55].map((h, i) => (
                      <div key={i} className="flex-1 max-w-3 bg-gradient-to-t from-teal-500 to-teal-300 rounded-t opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="col-span-12 md:col-span-4 space-y-3">
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Recent Activity</div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-teal-50 flex-shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-full bg-slate-100 rounded" />
                        <div className="h-1.5 w-3/5 bg-slate-50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF TICKER ═══ */}
      <section className="border-y border-slate-200/60 bg-white">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-7 flex flex-col items-center gap-4">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Trusted by leading institutions</span>
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />
            <div className="flex animate-ticker gap-16 w-max">
              {[...trustedSchools, ...trustedSchools, ...trustedSchools].map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-2.5 text-sm font-semibold text-slate-300 whitespace-nowrap">
                  <Hexagon className="w-3.5 h-3.5 text-slate-300" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES -- Bento Grid ═══ */}
      <section id="features" ref={featuresRef} className="reveal-section relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
          {/* Section header */}
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-700 mb-6">
              <Layers className="w-3.5 h-3.5" />
              Platform
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-bold mb-5 tracking-[-0.02em] leading-tight text-slate-900">
              Everything you need.{' '}
              <span className="text-gradient bg-gradient-to-r from-slate-400 to-slate-300">Nothing you don't.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
              Purpose-built for modern educational institutions, with features that feel effortless.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <BentoCard key={idx} feature={feature} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUTIONS / PERSONAS ═══ */}
      <section id="solutions" ref={personaRef} className="reveal-section relative bg-white border-y border-slate-200/60">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-semibold text-blue-700 mb-6">
              <Users className="w-3.5 h-3.5" />
              Solutions
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-bold mb-5 tracking-[-0.02em] leading-tight text-slate-900">
              Built for{' '}
              <span className="text-gradient bg-gradient-to-r from-teal-600 to-cyan-500">every role</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              From front office to classroom to home -- Synapse adapts to every stakeholder.
            </p>
          </div>

          <div className="max-w-[900px] mx-auto">
            {/* Tabs */}
            <div className="flex rounded-full bg-slate-100 p-1 mb-10 overflow-x-auto">
              {personas.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePersona(p.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${
                    activePersona === p.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>

            {/* Content panel */}
            <div className="bg-[#fafafa] border border-slate-200/80 rounded-2xl overflow-hidden" key={activePersona}>
              <div className="p-8 md:p-10 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  {/* Text */}
                  <div>
                    <div className={`inline-flex w-11 h-11 rounded-xl bg-gradient-to-br ${persona.color} items-center justify-center mb-5 text-white shadow-md`}>
                      {persona.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{persona.title}</h3>
                    <p className="text-sm text-slate-500 mb-7 leading-relaxed">{persona.desc}</p>
                    <ul className="space-y-3">
                      {persona.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-teal-50 border border-teal-200/60 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-teal-600" />
                          </div>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mock screens */}
                  <div className="grid grid-cols-2 gap-3">
                    {persona.screens.map((screen, i) => (
                      <div key={screen} className="bg-white border border-slate-200/80 rounded-xl h-44 flex flex-col items-center justify-center gap-3 hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                          {persona.screenIcons[i]}
                        </div>
                        <span className="text-xs font-medium text-slate-400">{screen}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="stats" ref={statsRef} className="reveal-section relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.02em] text-slate-900">
              Trusted by{' '}
              <span className="text-gradient bg-gradient-to-r from-teal-600 to-emerald-500">institutions that ship</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {statsData.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section ref={ctaRef} className="reveal-section max-w-[1200px] mx-auto px-5 md:px-8 pb-24 md:pb-36">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="relative bg-slate-900 rounded-3xl overflow-hidden">
            {/* Background accents */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.08] via-transparent to-violet-500/[0.08]" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-white/[0.04]" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full border border-white/[0.04]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/[0.04] rounded-full blur-[120px]" />

            <div className="relative z-10 py-20 md:py-28 px-8 flex flex-col items-center text-center gap-6">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight max-w-lg tracking-[-0.02em] text-white">
                Ready to transform your institution?
              </h3>
              <p className="text-slate-400 text-base max-w-md leading-relaxed">
                Set up in minutes with your own branded subdomain. No credit card required. Free for small teams.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
                <Link
                  to="/signup"
                  className="group px-8 py-4 text-sm font-semibold text-slate-900 bg-white rounded-full hover:bg-teal-50 transition-all hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 text-sm font-semibold text-white border border-white/[0.15] rounded-full hover:bg-white/[0.05] hover:border-white/[0.25] transition-all"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200/60 bg-white">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Hexagon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-base font-bold text-slate-900">Synapse</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-[220px]">
                The modern operating system for schools. Built for the future of education.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Integrations', 'Changelog'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400">&copy; 2026 Vara Labs. All rights reserved.</p>
            <div className="flex gap-1">
              {['X', 'Li', 'Gh'].map((label) => (
                <a key={label} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-xs font-semibold">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
