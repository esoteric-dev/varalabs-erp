import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { fetchNotices, createNotice } from '../../lib/queries/notices'
import { fetchMyClasses } from '../../lib/queries/teacher'
import type { Notice } from '../../lib/queries/notices'
import type { TeacherClass } from '../../lib/queries/teacher'
import type { OrgRole } from '../../lib/queries/user'

export const Route = createFileRoute('/_authenticated/notices')({
  component: NoticesPage,
})

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
}

const audienceLabels: Record<string, string> = {
  all: 'Everyone',
  teachers: 'Teachers',
  students: 'Students',
  parents: 'Parents',
  staff: 'Staff',
}

function NoticesPage() {
  const { myPermissions, myRoles } = Route.useRouteContext()
  const perms = myPermissions as string[]
  const slugs = (myRoles as OrgRole[]).map(r => r.slug)
  const isStudent = slugs.includes('student')
  const canManage = perms.includes('notices.manage')

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [priority, setPriority] = useState('normal')
  const [targetClasses, setTargetClasses] = useState('')

  const queryClient = useQueryClient()

  const { data: allNotices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn: fetchNotices,
  })

  // Students only see notices targeted at 'students' or 'all'
  const notices = isStudent
    ? allNotices.filter(n => n.audience === 'students' || n.audience === 'all')
    : allNotices

  const { data: classes = [] } = useQuery<TeacherClass[]>({
    queryKey: ['myClasses'],
    queryFn: fetchMyClasses,
    enabled: canManage,
  })

  const createMutation = useMutation({
    mutationFn: () => createNotice(title, body, audience, priority, targetClasses || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] })
      setShowForm(false)
      setTitle('')
      setBody('')
      setAudience('all')
      setPriority('normal')
      setTargetClasses('')
    },
  })

  const toggleClass = (className: string) => {
    const current = targetClasses ? targetClasses.split(',') : []
    if (current.includes(className)) {
      setTargetClasses(current.filter(c => c !== className).join(','))
    } else {
      setTargetClasses([...current, className].join(','))
    }
  }

  const selectedClasses = targetClasses ? targetClasses.split(',') : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notices</h2>
          <p className="text-sm text-gray-500 mt-0.5">Announcements and notifications</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Notice
          </button>
        )}
      </div>

      {/* Create Notice Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Notice</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              placeholder="Title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={audience}
              onChange={e => setAudience(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Everyone</option>
              <option value="teachers">Teachers</option>
              <option value="students">Students</option>
              <option value="parents">Parents</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          {classes.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Target Classes (optional)</label>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClass(c.className)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedClasses.includes(c.className)
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {c.className}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            placeholder="Notice body *"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title || !body || createMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Publishing...' : 'Publish Notice'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div key={notice.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">{notice.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${priorityColors[notice.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {notice.priority}
                  </span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700">
                    {audienceLabels[notice.audience] || notice.audience}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{notice.body}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>By {notice.createdByName}</span>
                <span>&middot;</span>
                <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                {!notice.published && (
                  <>
                    <span>&middot;</span>
                    <span className="text-amber-500 font-medium">Draft</span>
                  </>
                )}
                {notice.targetClasses && (
                  <>
                    <span>&middot;</span>
                    <div className="flex gap-1">
                      {notice.targetClasses.split(',').map(cls => (
                        <span key={cls} className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {notices.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No notices found</div>
          )}
        </div>
      )}
    </div>
  )
}
