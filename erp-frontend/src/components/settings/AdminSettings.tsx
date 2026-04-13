import { useState, useRef, useEffect } from 'react'
import { Building2, Shield, FileText, ClipboardList, Upload, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOrgBranding, updateOrgBranding, uploadOrgLogo, type OrgBranding } from '../../lib/queries/documents'
import { LogoCropModal } from './LogoCropModal'
import { RolesManager } from '../staff/RolesManager'
import DocumentTemplates from '../documents/DocumentTemplates'
import { OnboardingConfigPage } from '../onboarding/OnboardingConfigPage'

// ── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'organisation',  label: 'Organisation',       icon: Building2    },
  { id: 'onboarding',    label: 'Onboarding Forms',   icon: ClipboardList },
  { id: 'roles',         label: 'Roles & Permissions', icon: Shield       },
  { id: 'documents',     label: 'Document Templates', icon: FileText     },
] as const

type TabId = typeof TABS[number]['id']

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabId>('organisation')

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage organisation, forms, roles, and document templates</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'organisation'  && <OrgIdentityTab />}
      {activeTab === 'onboarding'    && <OnboardingConfigPage />}
      {activeTab === 'roles'         && <RolesManager />}
      {activeTab === 'documents'     && <DocumentTemplates />}
    </div>
  )
}

// ── Organisation Identity Tab ────────────────────────────────────────────────

function OrgIdentityTab() {
  const queryClient = useQueryClient()

  const { data: branding, isLoading } = useQuery<OrgBranding>({
    queryKey: ['orgBranding'],
    queryFn: fetchOrgBranding,
    staleTime: 5 * 60_000,
  })

  const [form, setForm]   = useState({ address: '', phone: '', website: '' })
  const [msg, setMsg]     = useState({ text: '', ok: true })
  const [saving, setSaving] = useState(false)

  // Logo upload state
  const [cropFile,    setCropFile]    = useState<File | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // Sync text fields once when branding first loads
  const synced = useRef(false)
  useEffect(() => {
    if (branding && !synced.current) {
      synced.current = true
      setForm({
        address: branding.address ?? '',
        phone:   branding.phone   ?? '',
        website: branding.website ?? '',
      })
    }
  }, [branding])

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 5000)
  }

  // ── Logo upload flow ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      console.log('AdminSettings: File selected', f.name, f.type, f.size)
      setCropFile(f)
    } else {
      console.log('AdminSettings: No file selected')
    }
    // Reset input so re-selecting same file still triggers onChange
    e.target.value = ''
  }

  const handleCropSave = async (blob: Blob) => {
    console.log('AdminSettings: Crop save called', blob.type, blob.size)
    setCropFile(null)
    setUploading(true)
    try {
      await uploadOrgLogo(blob)
      queryClient.invalidateQueries({ queryKey: ['orgBranding'] })
      flash('Logo updated!')
    } catch (err: any) {
      flash(err.message || 'Logo upload failed', false)
    } finally {
      setUploading(false)
    }
  }

  // ── Save text fields (logo URL managed separately via upload) ───────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      await updateOrgBranding({
        // Omit logoUrl — it is managed exclusively by the upload/remove buttons.
        // Sending it here could race with a pending logo upload and overwrite it.
        address: form.address || null,
        phone:   form.phone   || null,
        website: form.website || null,
      })
      queryClient.invalidateQueries({ queryKey: ['orgBranding'] })
      flash('Branding saved!')
    } catch (err: any) {
      flash(err.message || 'Failed to save', false)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="py-12 text-center text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      {msg.text && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Logo section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Organisation Logo</h3>
        <p className="text-xs text-gray-500 mb-5">Appears in document headers. Upload JPEG, PNG, or SVG (max 5 MB). The image will be cropped before upload.</p>

        <div className="flex items-center gap-5">
          {/* Preview */}
          <div className="shrink-0 w-20 h-20 rounded-xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Org logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : branding?.logoUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            {branding?.logoUrl && (
              <button
                onClick={async () => {
                  try {
                    await updateOrgBranding({ logoUrl: null })
                    queryClient.invalidateQueries({ queryKey: ['orgBranding'] })
                    flash('Logo removed')
                  } catch {
                    flash('Failed to remove logo', false)
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-3 h-3" /> Remove logo
              </button>
            )}
            <p className="text-xs text-gray-400">JPEG · PNG · SVG</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Contact details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Contact Details</h3>
        <p className="text-xs text-gray-500 mb-5">Shown in document footers alongside the logo.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <textarea
              rows={2}
              placeholder="123 School Road, City, State – 400001"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input
                type="url"
                placeholder="https://www.myschool.edu"
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </div>

      {/* Crop modal */}
      {cropFile && (
        <LogoCropModal
          file={cropFile}
          onSave={handleCropSave}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  )
}
