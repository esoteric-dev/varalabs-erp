import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, X, Copy, Check, ExternalLink,
  ChevronDown, Globe, KeyRound, BarChart3, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, ArrowRight, School, Group, Badge, Store, Lightbulb,
} from 'lucide-react'
import {
  fetchOrganisations, createOrganisation,
  fetchCustomDomains, addCustomDomain, removeCustomDomain,
  fetchOrgAdminUser, resetOrgAdminPassword,
  fetchOrgReportSummary, fetchServices,
  // updateOrganisationServices,
} from '../../lib/queries/user'
import type {
  Organisation, CreateOrgResponse, CustomDomain,
  OrgReportSummary, CurrentUser, Service,
} from '../../lib/queries/user'

type OrgTab = 'domains' | 'password' | 'analytics'

const getOrgUrl = (slug: string) => {
  const { protocol, hostname, port } = window.location
  const portStr = port ? `:${port}` : ''
  return `${protocol}//${hostname}${portStr}/${slug}/`
}

export function TenantAdminDashboard() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgType, setOrgType] = useState('school')
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'students', 'staff', 'attendance', 'fees', 'notices'
  ])
  const [formStep, setFormStep] = useState(1)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<OrgTab>('domains')

  const { data: orgs = [], isLoading } = useQuery<Organisation[]>({
    queryKey: ['organisations'],
    queryFn: fetchOrganisations,
  })

  const { data: availableServices = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: fetchServices,
    enabled: showForm,
  })

  const createOrgMutation = useMutation({
    mutationFn: ({ name, slug, orgType, serviceCodes }: { name: string; slug: string; orgType: string; serviceCodes: string[] }) =>
      createOrganisation(name, slug, orgType, serviceCodes),
    onSuccess: (data: CreateOrgResponse) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      setCredentials({ email: data.adminEmail, password: data.adminPassword })
      setOrgName('')
      setOrgSlug('')
      setOrgType('school')
      setSelectedServices(['students', 'staff', 'attendance', 'fees', 'notices'])
      setFormStep(1)
      setShowForm(false)
    },
  })

  const handleSlugChange = (value: string) => {
    setOrgSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    )
  }

  const handleOrgNameChange = (value: string) => {
    setOrgName(value)
    const auto = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    if (!orgSlug || orgSlug === autoSlug(orgName)) {
      setOrgSlug(auto)
    }
  }

  const toggleService = (code: string) => {
    setSelectedServices(prev => 
      prev.includes(code) 
        ? prev.filter(s => s !== code)
        : [...prev, code]
    )
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleOrg = (orgId: string) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
    } else {
      setExpandedOrg(orgId)
      setActiveTab('domains')
    }
  }

  const orgTypes = [
    { value: 'school', label: 'School', icon: School, description: 'K-12 education' },
    { value: 'college', label: 'College', icon: Group, description: 'Higher education' },
    { value: 'coaching', label: 'Coaching', icon: Lightbulb, description: 'Test prep / tuitions' },
    { value: 'company', label: 'Company', icon: Store, description: 'Management / corporate' },
    { value: 'other', label: 'Other', icon: Badge, description: 'Other institution' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organisations</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your schools and campuses
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setCredentials(null)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Organisation
        </button>
      </div>

      {/* Credentials Card (shown once after org creation) */}
      {credentials && (
        <CredentialsCard
          title="Organisation Created — Admin Credentials"
          subtitle="Save these credentials now. The password will not be shown again."
          email={credentials.email}
          password={credentials.password}
          copiedField={copiedField}
          onCopy={copyToClipboard}
          onDismiss={() => setCredentials(null)}
        />
      )}

      {/* Create Org Form - Multi-step Onboarding */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                formStep >= 1 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'
              }`}>1</div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                formStep >= 2 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'
              }`}>2</div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                formStep >= 3 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'
              }`}>3</div>
            </div>
            <button
              onClick={() => { setShowForm(false); setFormStep(1) }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step 1: Basic Info */}
          {formStep === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (orgName && orgSlug && orgSlug.length >= 3) {
                  setFormStep(2)
                }
              }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                  Tell us about your institution
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Institution Name
                  </label>
                  <input
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Greenwood International School"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500 whitespace-nowrap">
                      varalabs.dev/
                    </span>
                    <input
                      value={orgSlug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      required
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="greenwood"
                    />
                  </div>
                  {orgSlug && orgSlug.length < 3 && (
                    <p className="mt-1 text-xs text-red-500">
                      Subdomain must be at least 3 characters
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!orgName || orgSlug.length < 3}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Institution Type */}
          {formStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                  What type of institution is this?
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {orgTypes.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    onClick={() => setOrgType(value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      orgType === value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${
                      orgType === value ? 'text-teal-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-sm font-semibold ${
                      orgType === value ? 'text-teal-700' : 'text-gray-700'
                    }`}>{label}</div>
                    <div className="text-[11px] text-gray-400">{description}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="px-4 py-2.5 text-gray-500 text-sm font-medium hover:text-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(3)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Services */}
          {formStep === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createOrgMutation.mutate({ 
                  name: orgName, 
                  slug: orgSlug, 
                  orgType, 
                  serviceCodes: selectedServices 
                })
              }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Which services do you need?
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Select the modules you want to enable. You can change these later.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.code)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedServices.includes(service.code)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        selectedServices.includes(service.code) ? 'text-teal-700' : 'text-gray-700'
                      }`}>{service.name}</span>
                      {selectedServices.includes(service.code) && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">{service.category}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="px-4 py-2.5 text-gray-500 text-sm font-medium hover:text-gray-700"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={createOrgMutation.isPending || selectedServices.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {createOrgMutation.isPending ? 'Creating...' : 'Create Organisation'}
                </button>
              </div>
            </form>
          )}

          {createOrgMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(createOrgMutation.error as Error).message || 'Failed to create organisation'}
            </p>
          )}
        </div>
      )}

      {/* Org Cards */}
      {isLoading ? (
        <div className="text-center text-sm text-gray-400 py-12">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            No organisations yet
          </h3>
          <p className="text-xs text-gray-400">
            Create your first school or campus to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => {
            const isExpanded = expandedOrg === org.id
            return (
              <div
                key={org.id}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded ? 'border-teal-200 shadow-sm' : 'border-gray-100 hover:shadow-md'
                }`}
              >
                {/* Org Header */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => toggleOrg(org.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {org.name}
                    </h3>
                    <p className="text-xs text-teal-600 font-medium">
                      varalabs.dev/{org.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400 hidden sm:block">
                      Created{' '}
                      {new Date(org.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <a
                      href={getOrgUrl(org.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700 transition-colors"
                      title="Open organisation portal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Tab Bar */}
                    <div className="flex gap-1 px-5 pt-3 pb-0">
                      {([
                        { key: 'domains' as OrgTab, label: 'Custom Domains', icon: Globe },
                        { key: 'password' as OrgTab, label: 'Admin Password', icon: KeyRound },
                        { key: 'analytics' as OrgTab, label: 'Analytics', icon: BarChart3 },
                      ]).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setActiveTab(key)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                            activeTab === key
                              ? 'bg-gray-50 text-teal-700 border border-gray-100 border-b-white -mb-px'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-5 bg-gray-50 rounded-b-xl">
                      {activeTab === 'domains' && (
                        <CustomDomainsTab
                          org={org}
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      )}
                      {activeTab === 'password' && (
                        <AdminPasswordTab
                          org={org}
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      )}
                      {activeTab === 'analytics' && (
                        <AnalyticsTab org={org} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Credentials Card ──────────────────────────────────────────────────────

function CredentialsCard({
  title,
  subtitle,
  email,
  password,
  copiedField,
  onCopy,
  onDismiss,
}: {
  title: string
  subtitle: string
  email: string
  password: string
  copiedField: string | null
  onCopy: (text: string, field: string) => void
  onDismiss: () => void
}) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-emerald-800 mb-1">{title}</h3>
          <p className="text-xs text-emerald-600 mb-4">{subtitle}</p>
        </div>
        <button onClick={onDismiss} className="text-emerald-400 hover:text-emerald-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Email
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-gray-800">{email}</span>
            <button
              onClick={() => onCopy(email, 'cred-email')}
              className="text-gray-400 hover:text-teal-600 transition-colors"
              title="Copy"
            >
              {copiedField === 'cred-email' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Password
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-gray-800">{password}</span>
            <button
              onClick={() => onCopy(password, 'cred-pw')}
              className="text-gray-400 hover:text-teal-600 transition-colors"
              title="Copy"
            >
              {copiedField === 'cred-pw' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Custom Domains Tab ──────────────────────────────────────────────────

function CustomDomainsTab({
  org,
  copiedField,
  onCopy,
}: {
  org: Organisation
  copiedField: string | null
  onCopy: (text: string, field: string) => void
}) {
  const queryClient = useQueryClient()
  const [newDomain, setNewDomain] = useState('')

  const { data: domains = [], isLoading } = useQuery<CustomDomain[]>({
    queryKey: ['customDomains', org.id],
    queryFn: () => fetchCustomDomains(org.id),
  })

  const addMutation = useMutation({
    mutationFn: (domain: string) => addCustomDomain(org.id, domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDomains', org.id] })
      setNewDomain('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (domainId: string) => removeCustomDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDomains', org.id] })
    },
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Add Custom Domain
        </h4>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newDomain.trim()) {
              addMutation.mutate(newDomain.trim())
            }
          }}
          className="flex gap-2"
        >
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="school.example.com"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newDomain.trim() || addMutation.isPending}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {addMutation.isPending ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
        {addMutation.isError && (
          <p className="mt-2 text-xs text-red-600">
            {(addMutation.error as Error).message || 'Failed to add domain'}
          </p>
        )}
      </div>

      {/* Portal Link */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Portal URL:</span>{' '}
          <button
            onClick={() => onCopy(getOrgUrl(org.slug), 'cname')}
            className="font-mono font-medium text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            varalabs.dev/{org.slug}
            {copiedField === 'cname' ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </p>
      </div>

      {/* Domain List */}
      {isLoading ? (
        <div className="text-center text-xs text-gray-400 py-4">Loading domains...</div>
      ) : domains.length === 0 ? (
        <div className="text-center text-xs text-gray-400 py-4">
          No custom domains configured
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-800">{d.domain}</span>
                {d.verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>
              <button
                onClick={() => removeMutation.mutate(d.id)}
                disabled={removeMutation.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove domain"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin Password Tab ──────────────────────────────────────────────────

function AdminPasswordTab({
  org,
  copiedField,
  onCopy,
}: {
  org: Organisation
  copiedField: string | null
  onCopy: (text: string, field: string) => void
}) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualPassword, setManualPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null)

  const { data: adminUser, isLoading } = useQuery<CurrentUser | null>({
    queryKey: ['orgAdminUser', org.id],
    queryFn: () => fetchOrgAdminUser(org.id),
  })

  const resetMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword?: string }) =>
      resetOrgAdminPassword(userId, newPassword),
    onSuccess: (data) => {
      if (data.generatedPassword && adminUser) {
        setResetResult({ email: adminUser.email, password: data.generatedPassword })
      } else if (adminUser) {
        setResetResult({ email: adminUser.email, password: '(your chosen password)' })
      }
      setManualPassword('')
      setConfirmPassword('')
    },
  })

  const adminEmail = `admin@${org.slug}.com`

  return (
    <div className="space-y-4">
      {/* Admin User Info */}
      <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Organisation Admin
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-800">
            {isLoading ? 'Loading...' : adminUser?.email ?? adminEmail}
          </span>
          <button
            onClick={() => onCopy(adminUser?.email ?? adminEmail, 'admin-email')}
            className="text-gray-400 hover:text-teal-600 transition-colors"
            title="Copy"
          >
            {copiedField === 'admin-email' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Reset Result */}
      {resetResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-xs font-semibold text-emerald-800">Password Reset Successful</h4>
            <button onClick={() => setResetResult(null)} className="text-emerald-400 hover:text-emerald-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white rounded border border-emerald-100 px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Email</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-800">{resetResult.email}</span>
                <button
                  onClick={() => onCopy(resetResult.email, 'reset-email')}
                  className="text-gray-400 hover:text-teal-600"
                >
                  {copiedField === 'reset-email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded border border-emerald-100 px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">New Password</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-800">{resetResult.password}</span>
                <button
                  onClick={() => onCopy(resetResult.password, 'reset-pw')}
                  className="text-gray-400 hover:text-teal-600"
                >
                  {copiedField === 'reset-pw' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Reset Password
        </h4>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('auto')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'auto'
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Auto-generate
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'manual'
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Set manually
          </button>
        </div>

        {mode === 'auto' ? (
          <button
            onClick={() => {
              if (adminUser) {
                resetMutation.mutate({ userId: adminUser.id })
              }
            }}
            disabled={!adminUser || resetMutation.isPending}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {resetMutation.isPending ? 'Resetting...' : 'Generate New Password'}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (adminUser && manualPassword && manualPassword === confirmPassword) {
                resetMutation.mutate({ userId: adminUser.id, newPassword: manualPassword })
              }
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            {manualPassword && confirmPassword && manualPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            {manualPassword && manualPassword.length < 6 && (
              <p className="text-xs text-red-500">Password must be at least 6 characters</p>
            )}
            <button
              type="submit"
              disabled={
                !adminUser ||
                resetMutation.isPending ||
                !manualPassword ||
                manualPassword.length < 6 ||
                manualPassword !== confirmPassword
              }
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Set Password'}
            </button>
          </form>
        )}

        {resetMutation.isError && (
          <p className="mt-2 text-xs text-red-600">
            {(resetMutation.error as Error).message || 'Failed to reset password'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Analytics Tab ──────────────────────────────────────────────────────

function AnalyticsTab({ org }: { org: Organisation }) {
  const { data: summary, isLoading, dataUpdatedAt } = useQuery<OrgReportSummary>({
    queryKey: ['orgReportSummary', org.id],
    queryFn: () => fetchOrgReportSummary(org.id),
    staleTime: 5 * 60_000,
  })

  const queryClient = useQueryClient()

  const stats = summary
    ? [
        { label: 'Total Students', value: summary.totalStudents },
        { label: 'Total Staff', value: summary.totalStaff },
        {
          label: 'Attendance Today',
          value:
            summary.attendanceTodayTotal > 0
              ? `${summary.attendanceTodayPresent}/${summary.attendanceTodayTotal} (${Math.round(
                  (summary.attendanceTodayPresent / summary.attendanceTodayTotal) * 100,
                )}%)`
              : '0/0',
        },
        {
          label: 'Fees Collected',
          value: `${(summary.feesCollected / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`,
        },
        {
          label: 'Fees Pending',
          value: `${(summary.feesPending / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`,
        },
        { label: 'Pending Admissions', value: summary.pendingAdmissions },
        { label: 'Active Notices', value: summary.activeNotices },
      ]
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Organisation Stats
        </h4>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-gray-400">
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['orgReportSummary', org.id] })}
            className="text-gray-400 hover:text-teal-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center text-xs text-gray-400 py-8">Loading analytics...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-gray-100 px-4 py-3"
            >
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className="text-lg font-bold text-gray-800">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
