import { useState } from 'react'
import { CheckCircle2, Clock, Circle, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { WidgetHeader } from './WidgetHeader'
import { TimeFilterDropdown } from './TimeFilterDropdown'
import { createTodo, updateTodo, deleteTodo, type AdminTodo } from '../../../lib/queries/dashboard'

interface TodoWidgetProps {
  todos: AdminTodo[]
}

const todoStatusIcon = (s: string) => {
  if (s === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (s === 'in_progress') return <Clock className="w-4 h-4 text-amber-500" />
  return <Circle className="w-4 h-4 text-gray-300" />
}

const todoStatusLabel = (s: string) => {
  if (s === 'completed') return 'Completed'
  if (s === 'in_progress') return 'In Progress'
  return 'Yet to Start'
}

const todoStatusColor = (s: string) => {
  if (s === 'completed') return 'bg-emerald-50 text-emerald-600'
  if (s === 'in_progress') return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-500'
}

const nextStatus = (s: string) => {
  if (s === 'yet_to_start') return 'in_progress'
  if (s === 'in_progress') return 'completed'
  return 'yet_to_start'
}

export function TodoWidget({ todos }: TodoWidgetProps) {
  const [newTodo, setNewTodo] = useState('')
  const [period, setPeriod] = useState('today')
  const qc = useQueryClient()

  const todoCreate = useMutation({
    mutationFn: (title: string) => createTodo(title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminTodos'] }); setNewTodo('') },
  })
  const todoUpdate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTodo(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminTodos'] }),
  })
  const todoDelete = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminTodos'] }),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <WidgetHeader
        title="Todo"
        rightContent={<TimeFilterDropdown value={period} onChange={setPeriod} />}
      />
      <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
        {todos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
        ) : (
          todos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50/60 transition-colors group">
              <button onClick={() => todoUpdate.mutate({ id: t.id, status: nextStatus(t.status) })} className="flex-shrink-0">
                {todoStatusIcon(t.status)}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                {t.dueTime && <p className="text-xs text-gray-400">{t.dueTime}</p>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${todoStatusColor(t.status)}`}>
                {todoStatusLabel(t.status)}
              </span>
              <button
                onClick={() => todoDelete.mutate(t.id)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                &#10005;
              </button>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (newTodo.trim()) todoCreate.mutate(newTodo.trim()) }}
        className="flex gap-2"
      >
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newTodo.trim() || todoCreate.isPending}
          className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
