import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import type { AddStudentInput } from '../../../../lib/queries/students'
import { fetchNextAdmissionNumber } from '../../../../lib/queries/students'
import { fetchClasses, addClass } from '../../../../lib/queries/dashboard'

interface Props {
  data: Partial<AddStudentInput>
  updateData: (data: Partial<AddStudentInput>) => void
  config: { enabled: boolean; mandatoryFields: string[] }
}

export default function PersonalInfo({ data, updateData, config }: Props) {
  const isReq = (field: string) => config.mandatoryFields.includes(field)
  const qc = useQueryClient()
  const [showAddClass, setShowAddClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [addClassError, setAddClassError] = useState<string | null>(null)

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  })

  const { data: nextAdmissionNumber } = useQuery({
    queryKey: ['nextAdmissionNumber'],
    queryFn: fetchNextAdmissionNumber,
  })

  const addClassMut = useMutation({
    mutationFn: (name: string) => addClass(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      setNewClassName('')
      setShowAddClass(false)
      setAddClassError(null)
    },
    onError: (err: any) => {
      setAddClassError(err.response?.errors?.[0]?.message || err.message || 'Failed to add class')
    },
  })

  const inputCls = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-shadow"

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Name {isReq('name') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('name')}
            value={data.name || ''}
            onChange={(e) => updateData({ name: e.target.value })}
            className={inputCls}
            placeholder="John Doe"
          />
        </div>

        {/* Class — Dropdown with inline Add */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class {isReq('className') && <span className="text-red-500">*</span>}
          </label>
          <div className="flex gap-2">
            <select
              required={isReq('className')}
              value={data.className || ''}
              onChange={(e) => updateData({ className: e.target.value })}
              className={`flex-1 ${inputCls}`}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddClass(!showAddClass)}
              className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0"
              title="Add new class"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showAddClass && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => { setNewClassName(e.target.value); setAddClassError(null) }}
                  placeholder="e.g. Grade 10-A"
                  className={`flex-1 ${inputCls}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => newClassName.trim() && addClassMut.mutate(newClassName.trim())}
                  disabled={!newClassName.trim() || addClassMut.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {addClassMut.isPending ? '...' : 'Add'}
                </button>
              </div>
              {addClassError && (
                <p className="text-sm text-red-600">{addClassError}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender {isReq('gender') && <span className="text-red-500">*</span>}
          </label>
          <select
            required={isReq('gender')}
            value={data.gender || ''}
            onChange={(e) => updateData({ gender: e.target.value })}
            className={inputCls}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth {isReq('dateOfBirth') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            required={isReq('dateOfBirth')}
            value={data.dateOfBirth || ''}
            onChange={(e) => updateData({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blood Group {isReq('bloodGroup') && <span className="text-red-500">*</span>}
          </label>
          <select
            required={isReq('bloodGroup')}
            value={data.bloodGroup || ''}
            onChange={(e) => updateData({ bloodGroup: e.target.value })}
            className={inputCls}
          >
            <option value="">Select Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Religion {isReq('religion') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required={isReq('religion')}
            value={data.religion || ''}
            onChange={(e) => updateData({ religion: e.target.value })}
            className={inputCls}
            placeholder="Christianity, Islam, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address {isReq('email') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            required={isReq('email')}
            value={data.email || ''}
            onChange={(e) => updateData({ email: e.target.value })}
            className={inputCls}
            placeholder="student@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number {isReq('phone') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            required={isReq('phone')}
            value={data.phone || ''}
            onChange={(e) => updateData({ phone: e.target.value })}
            className={inputCls}
            placeholder="+1 234 567 8900"
          />
        </div>
        
        {/* Admission Number — Read-only, auto-generated */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Number
          </label>
          <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
            {nextAdmissionNumber || 'Loading...'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Date {isReq('admissionDate') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            required={isReq('admissionDate')}
            value={data.admissionDate || ''}
            onChange={(e) => updateData({ admissionDate: e.target.value })}
            className={inputCls}
          />
        </div>

      </div>
    </div>
  )
}
