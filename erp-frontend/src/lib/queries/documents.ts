import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'
import { API_BASE } from '../api-base'

// ── Types ──────────────────────────────────────────────────────────────────

export interface OrgBranding {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  address: string | null
  phone: string | null
  website: string | null
}

export async function fetchOrgBranding(): Promise<OrgBranding> {
  const data = await gqlClient.request<{ orgBranding: OrgBranding }>(
    gql`query OrgBranding {
      orgBranding { id name slug logoUrl address phone website }
    }`,
  )
  return data.orgBranding
}

export async function updateOrgBranding(fields: {
  logoUrl?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
}): Promise<OrgBranding> {
  const data = await gqlClient.request<{ updateOrgBranding: OrgBranding }>(
    gql`mutation UpdateOrgBranding($logoUrl: String, $address: String, $phone: String, $website: String) {
      updateOrgBranding(logoUrl: $logoUrl, address: $address, phone: $phone, website: $website) {
        id name logoUrl address phone website
      }
    }`,
    fields,
  )
  return data.updateOrgBranding
}

export interface DocumentType {
  code: string
  name: string
  description: string
  availableVars: string[]
  pageSize: string
  orientation: string
  sortOrder: number
}

export interface DocumentTemplate {
  id: string
  organisationId: string
  tenantId: string
  documentType: string
  name: string
  description: string
  htmlContent: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ── Queries ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES_QUERY = gql`
  query DocumentTypes {
    documentTypes {
      code name description availableVars pageSize orientation sortOrder
    }
  }
`

export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  const data = await gqlClient.request<{ documentTypes: DocumentType[] }>(DOCUMENT_TYPES_QUERY)
  return data.documentTypes
}

const DOCUMENT_TEMPLATES_QUERY = gql`
  query DocumentTemplates($documentType: String) {
    documentTemplates(documentType: $documentType) {
      id organisationId tenantId documentType
      name description htmlContent isDefault
      createdAt updatedAt
    }
  }
`

export async function fetchDocumentTemplates(documentType?: string): Promise<DocumentTemplate[]> {
  const data = await gqlClient.request<{ documentTemplates: DocumentTemplate[] }>(
    DOCUMENT_TEMPLATES_QUERY,
    { documentType: documentType ?? null },
  )
  return data.documentTemplates
}

const PLATFORM_TEMPLATE_HTML_QUERY = gql`
  query PlatformTemplateHtml($documentType: String!) {
    platformTemplateHtml(documentType: $documentType)
  }
`

export async function fetchPlatformTemplateHtml(documentType: string): Promise<string> {
  const data = await gqlClient.request<{ platformTemplateHtml: string }>(
    PLATFORM_TEMPLATE_HTML_QUERY,
    { documentType },
  )
  return data.platformTemplateHtml
}

// ── Mutations ──────────────────────────────────────────────────────────────

const CREATE_TEMPLATE_MUTATION = gql`
  mutation CreateDocumentTemplate(
    $documentType: String!
    $name: String!
    $htmlContent: String!
    $description: String
    $isDefault: Boolean
  ) {
    createDocumentTemplate(
      documentType: $documentType
      name: $name
      htmlContent: $htmlContent
      description: $description
      isDefault: $isDefault
    ) {
      id documentType name description htmlContent isDefault createdAt updatedAt
    }
  }
`

export async function createDocumentTemplate(args: {
  documentType: string
  name: string
  htmlContent: string
  description?: string
  isDefault?: boolean
}): Promise<DocumentTemplate> {
  const data = await gqlClient.request<{ createDocumentTemplate: DocumentTemplate }>(
    CREATE_TEMPLATE_MUTATION,
    args,
  )
  return data.createDocumentTemplate
}

const UPDATE_TEMPLATE_MUTATION = gql`
  mutation UpdateDocumentTemplate(
    $id: String!
    $name: String
    $htmlContent: String
    $description: String
    $isDefault: Boolean
  ) {
    updateDocumentTemplate(
      id: $id
      name: $name
      htmlContent: $htmlContent
      description: $description
      isDefault: $isDefault
    ) {
      id documentType name description htmlContent isDefault updatedAt
    }
  }
`

export async function updateDocumentTemplate(
  id: string,
  fields: { name?: string; htmlContent?: string; description?: string; isDefault?: boolean },
): Promise<DocumentTemplate> {
  const data = await gqlClient.request<{ updateDocumentTemplate: DocumentTemplate }>(
    UPDATE_TEMPLATE_MUTATION,
    { id, ...fields },
  )
  return data.updateDocumentTemplate
}

const SET_DEFAULT_MUTATION = gql`
  mutation SetDefaultDocumentTemplate($id: String!) {
    setDefaultDocumentTemplate(id: $id) {
      id documentType name isDefault updatedAt
    }
  }
`

export async function setDefaultDocumentTemplate(id: string): Promise<DocumentTemplate> {
  const data = await gqlClient.request<{ setDefaultDocumentTemplate: DocumentTemplate }>(
    SET_DEFAULT_MUTATION,
    { id },
  )
  return data.setDefaultDocumentTemplate
}

const DELETE_TEMPLATE_MUTATION = gql`
  mutation DeleteDocumentTemplate($id: String!) {
    deleteDocumentTemplate(id: $id)
  }
`

export async function deleteDocumentTemplate(id: string): Promise<boolean> {
  const data = await gqlClient.request<{ deleteDocumentTemplate: boolean }>(
    DELETE_TEMPLATE_MUTATION,
    { id },
  )
  return data.deleteDocumentTemplate
}

// ── PDF Generation ─────────────────────────────────────────────────────────

function getAuthToken(): string {
  const t = localStorage.getItem('authToken')
  if (!t) throw new Error('Not authenticated')
  return t
}

function downloadBlob(blob: Blob, response: Response, fallbackName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = response.headers.get('content-disposition')?.match(/filename="(.+?)"/)?.[1] ?? fallbackName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Download a generated document PDF for a staff member or student. */
export async function generateDocument(
  entityId: string,
  docType: string,
  opts: { templateId?: string; studentId?: string; feeRecordId?: string; month?: number; year?: number } = {},
): Promise<void> {
  const params = new URLSearchParams({ doc_type: docType })
  if (opts.templateId)   params.set('template_id', opts.templateId)
  if (opts.studentId)    params.set('student_id', opts.studentId)
  if (opts.feeRecordId)  params.set('fee_record_id', opts.feeRecordId)
  if (opts.month != null) params.set('month', String(opts.month))
  if (opts.year  != null) params.set('year',  String(opts.year))

  const resp = await fetch(`${API_BASE}/api/documents/${entityId}/generate?${params}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  })
  if (!resp.ok) throw new Error((await resp.text()) || `Failed (${resp.status})`)
  downloadBlob(await resp.blob(), resp, `${docType}.pdf`)
}

/** Send raw HTML to the backend and get back a PDF blob URL for preview. */
export async function previewDocumentHtml(html: string): Promise<string> {
  const resp = await fetch(`${API_BASE}/api/documents/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ html }),
  })
  if (!resp.ok) throw new Error((await resp.text()) || 'Preview failed')
  return URL.createObjectURL(await resp.blob())
}

/** Upload the organisation logo (WebP for raster, SVG as-is). Returns the stored URL. */
export async function uploadOrgLogo(blob: Blob): Promise<string> {
  const form = new FormData()
  const ext = blob.type === 'image/svg+xml' ? 'svg' : 'webp'
  form.append('logo', blob, `logo.${ext}`)
  const resp = await fetch(`${API_BASE}/api/organisations/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: form,
  })
  if (!resp.ok) throw new Error((await resp.text()) || `Upload failed (${resp.status})`)
  const data = await resp.json()
  return data.logoUrl as string
}

/** Generate a payslip for a staff member for the given month/year. */
export async function generatePayslip(
  userId: string,
  month: number,
  year: number,
): Promise<void> {
  return generateDocument(userId, 'payslip', { month, year })
}

/** Generate a fee receipt for a specific fee record. */
export async function generateFeeSlip(feeRecordId: string): Promise<void> {
  return generateDocument(feeRecordId, 'fee_slip', { feeRecordId })
}

// Backward-compat wrapper used in the users page
export async function generateOfferLetter(
  userId: string,
  docType: 'offer_letter' | 'joining_letter' = 'offer_letter',
): Promise<void> {
  return generateDocument(userId, docType)
}
