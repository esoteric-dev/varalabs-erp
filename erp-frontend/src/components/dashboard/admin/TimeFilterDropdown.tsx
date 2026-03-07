import { ChevronDown } from 'lucide-react'

interface TimeFilterDropdownProps {
  value: string
  options?: { label: string; value: string }[]
  onChange: (value: string) => void
}

const DEFAULT_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
]

export function TimeFilterDropdown({ value, options = DEFAULT_OPTIONS, onChange }: TimeFilterDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
