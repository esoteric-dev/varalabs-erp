export function SystemStatus() {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
      {/* Decorative blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 opacity-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />

      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
        <span className="material-symbols-outlined text-teal-400">dns</span>
        System Status
      </h3>

      <div className="space-y-4 relative z-10">
        {/* Server Load */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-300">Server Load</span>
          <span className="text-sm font-bold text-teal-400">12%</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div className="bg-teal-400 h-full rounded-full" style={{ width: '12%' }} />
        </div>

        {/* Database Storage */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-slate-300">Database Storage</span>
          <span className="text-sm font-bold text-blue-400">64%</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-400 h-full rounded-full" style={{ width: '64%' }} />
        </div>

        {/* Active Sessions */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-slate-300">Active Sessions</span>
          <span className="text-sm font-bold text-white">482</span>
        </div>
      </div>
    </div>
  )
}
