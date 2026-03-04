import { useState } from 'react';
import {
  Palette, Zap, Users, Settings, Play, Hexagon,
  Facebook, Twitter, Linkedin, Instagram, ArrowRight,
  Shield, BarChart3, BookOpen, GraduationCap, ClipboardCheck,
  Monitor, Smartphone, Star, ChevronRight, Sparkles,
} from 'lucide-react';

const personaContent: Record<string, { title: string; subtitle: string; bullets: string[]; mockLabel: string; mockSublabel: string }> = {
  Office: {
    title: 'Admin Command Center',
    subtitle: 'Desktop-first, comprehensive administrative tools',
    bullets: ['Real-time enrollment dashboards', 'Fee collection & reconciliation', 'Staff payroll automation'],
    mockLabel: 'Dashboard',
    mockSublabel: 'Analytics & Reports',
  },
  Teacher: {
    title: 'Teacher Toolkit',
    subtitle: 'Mobile-first, effortless attendance & grading',
    bullets: ['One-tap digital attendance', 'Gradebook with auto-calculation', 'Lesson plan management'],
    mockLabel: 'Attendance',
    mockSublabel: 'Gradebook',
  },
  Student: {
    title: 'Student Portal',
    subtitle: 'Self-serve academic & campus tools',
    bullets: ['Assignment submissions', 'Live class schedules', 'Performance analytics'],
    mockLabel: 'Assignments',
    mockSublabel: 'Schedule',
  },
  Guardian: {
    title: 'Parent Connect',
    subtitle: 'Stay informed, stay involved',
    bullets: ['Live attendance alerts', 'Fee payment gateway', 'Direct teacher messaging'],
    mockLabel: 'Notifications',
    mockSublabel: 'Fee Portal',
  },
};

const Landing = () => {
  const [activeTab, setActiveTab] = useState('Office');

  const features = [
    { icon: <Palette className="w-5 h-5" />, title: 'Dynamic Branding', desc: 'Instantly apply your school\'s colors and logo across the entire platform.', color: 'from-teal-500 to-emerald-500' },
    { icon: <Zap className="w-5 h-5" />, title: 'Optimistic UI', desc: 'Experience a lightning-fast interface with zero-latency data updates.', color: 'from-amber-500 to-orange-500' },
    { icon: <Users className="w-5 h-5" />, title: 'Multi-Tenant Architecture', desc: 'Secure, isolated data environments for every institution on a shared codebase.', color: 'from-blue-500 to-indigo-500' },
    { icon: <Settings className="w-5 h-5" />, title: 'Autonomous Workflows', desc: 'Automate administrative tasks, scheduling, and reporting end-to-end.', color: 'from-violet-500 to-purple-500' },
    { icon: <Shield className="w-5 h-5" />, title: 'Enterprise Security', desc: 'Role-based access control, audit logs, and encryption at every layer.', color: 'from-rose-500 to-pink-500' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Analytics & Insights', desc: 'Actionable intelligence from attendance trends to financial projections.', color: 'from-cyan-500 to-teal-500' },
  ];

  const active = personaContent[activeTab];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-teal-100 relative overflow-hidden">
      {/* Global background mesh */}
      <div className="mesh-gradient fixed inset-0 pointer-events-none" />

      {/* Floating decorative orbs */}
      <div className="fixed top-20 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-teal-200/30 to-cyan-200/20 blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-violet-200/20 to-indigo-200/20 blur-3xl animate-float-reverse pointer-events-none" />

      {/* Top Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-white/60">
        <div className="flex items-center justify-between px-8 py-4 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Synapse</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-500">
            <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-teal-600 transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-teal-600 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-teal-600 transition-colors">About Us</a>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors">
              Log In
            </button>
            <button className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0">
              Request a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Single Column Layout */}
      <main className="relative z-10">

        {/* ===== HERO SECTION ===== */}
        <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-24">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="animate-fade-in-up opacity-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-xs font-semibold text-teal-700 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Now with AI-powered insights
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight max-w-3xl mx-auto">
                The Modern{' '}
                <span className="text-gradient bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 animate-gradient">
                  Operating System
                </span>{' '}
                for Schools
              </h1>
            </div>
            <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl animate-fade-in-up opacity-0 animation-delay-200">
              Empower administrators, teachers, students, and guardians with an intuitive, cloud-first ERP designed for the future of education.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 animate-fade-in-up opacity-0 animation-delay-300">
              <button className="group px-7 py-3.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                Get Started Today
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                </div>
                Watch Video
              </button>
            </div>
          </div>

          {/* Mockup */}
          <div className="relative mt-16 max-w-4xl mx-auto animate-scale-in opacity-0 animation-delay-500">
            <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-white border border-gray-200/80 rounded-2xl shadow-2xl overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-12">
                  <div className="w-64 h-6 bg-gray-100 rounded-lg mx-auto" />
                </div>
              </div>
              {/* Dashboard content */}
              <div className="p-6 grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-4">
                  <div className="h-5 w-40 bg-slate-100 rounded" />
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Students', value: '2,847', color: 'bg-teal-500' },
                      { label: 'Staff', value: '186', color: 'bg-blue-500' },
                      { label: 'Revenue', value: '$1.4M', color: 'bg-violet-500' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="text-xs text-slate-400">{stat.label}</div>
                        <div className="text-lg font-bold text-slate-700">{stat.value}</div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div className={`h-1.5 rounded-full ${stat.color}`} style={{ width: `${65 + Math.random() * 25}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-28 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100/50 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-teal-300" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-20 bg-slate-100 rounded" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-full bg-gray-100 rounded" />
                        <div className="h-1.5 w-2/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUSTED BY ===== */}
        <section className="border-y border-gray-100 bg-white/50">
          <div className="max-w-[1200px] mx-auto px-8 py-10 flex flex-col items-center gap-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trusted by leading institutions</span>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-slate-400">
              {['Greenwood Academy', "St. Mary's School", 'Oakridge Int.', 'Delhi Public School', 'Ryan International'].map((name) => (
                <span key={name} className="flex items-center gap-2 text-sm font-semibold hover:text-slate-600 transition-colors">
                  <Hexagon className="w-4 h-4" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES SECTION ===== */}
        <section id="features" className="max-w-[1200px] mx-auto px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, nothing you don't</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Built from the ground up for modern educational institutions, with powerful features that just work.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 bg-white/80 border border-gray-100 rounded-2xl hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 text-white shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== PERSONA / SOLUTIONS SECTION ===== */}
        <section id="solutions" className="bg-white/60 border-y border-gray-100">
          <div className="max-w-[1200px] mx-auto px-8 py-24">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for every role</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Whether you're an admin, teacher, student, or parent -- Synapse adapts to the way you work.</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-gray-200/40 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  {(['Office', 'Teacher', 'Student', 'Guardian'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 text-sm font-medium text-center transition-all relative ${
                        activeTab === tab
                          ? 'text-teal-700 bg-teal-50/50'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Panel Content */}
                <div className="p-8" key={activeTab}>
                  <div className="animate-slide-in-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Left: text */}
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">{active.title}</h4>
                        <p className="text-sm text-slate-500 mb-6">{active.subtitle}</p>
                        <ul className="space-y-3">
                          {active.bullets.map((b, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                              <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                                <ChevronRight className="w-3.5 h-3.5 text-teal-600" />
                              </div>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Right: mock screens */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 rounded-xl h-48 flex flex-col items-center justify-center gap-2">
                          <Monitor className="w-7 h-7 text-slate-300" />
                          <span className="text-xs font-medium text-slate-400">{active.mockLabel}</span>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 rounded-xl h-48 flex flex-col items-center justify-center gap-2">
                          <Smartphone className="w-7 h-7 text-slate-300" />
                          <span className="text-xs font-medium text-slate-400">{active.mockSublabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== STATS SECTION ===== */}
        <section className="max-w-[1200px] mx-auto px-8 py-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Schools Onboarded', icon: <GraduationCap className="w-6 h-6" /> },
              { value: '2M+', label: 'Students Managed', icon: <BookOpen className="w-6 h-6" /> },
              { value: '99.9%', label: 'Platform Uptime', icon: <ClipboardCheck className="w-6 h-6" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-3 p-8 bg-white/80 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-500">
                  {stat.icon}
                </div>
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="max-w-[1200px] mx-auto px-8 pb-24">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/30">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10" />
            {/* Decorative */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/5" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border border-white/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />

            <div className="relative z-10 py-20 px-8 flex flex-col items-center text-center gap-6 text-white">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight max-w-xl">
                Ready to Transform Your Institution?
              </h3>
              <p className="text-slate-400 text-base max-w-lg">
                Schedule a personalized demo and see how Synapse can streamline every operation from day one.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                <button className="px-8 py-4 text-sm font-semibold text-slate-900 bg-white rounded-xl hover:bg-teal-50 hover:text-teal-700 transition-all hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 active:translate-y-0">
                  Request a Free Demo
                </button>
                <button className="px-8 py-4 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/10 transition-all">
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-gray-200/60 bg-white/40">
          <div className="max-w-[1200px] mx-auto px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <Hexagon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-700">Synapse</span>
            </div>
            <div className="flex gap-6 text-xs font-medium text-slate-400">
              <a href="#" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-teal-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-teal-600 transition-colors">Contact</a>
            </div>
            <p className="text-xs text-slate-300">&copy; 2025 Synapse Technologies</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-100 hover:bg-teal-50 cursor-pointer transition-all">
                  <Icon className="w-3.5 h-3.5" />
                </div>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
