import type { ReactNode } from 'react'

interface WidgetHeaderProps {
  title: string
  rightContent?: ReactNode
}

export function WidgetHeader({ title, rightContent }: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {rightContent}
    </div>
  )
}
