import { gql } from 'graphql-request'
import { gqlClient } from './graphql-client'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Types ─────────────────────────────────────────────────────────────────

export interface OfferLetterTemplate {
  id: string
  organisationId: string
  name: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ── Template Queries ──────────────────────────────────────────────────────

const LIST_TEMPLATES_QUERY = gql`
  query OfferLetterTemplates {
    offerLetterTemplates {
      id
      organisationId
      name
      content
      isDefault
      createdAt
      updatedAt
    }
  }
`

export async function fetchOfferLetterTemplates(): Promise<OfferLetterTemplate[]> {
  const data = await gqlClient.request<{ offerLetterTemplates: OfferLetterTemplate[] }>(LIST_TEMPLATES_QUERY)
  return data.offerLetterTemplates
}

const DEFAULT_TERMS_QUERY = gql`
  query DefaultOfferLetterTerms($letterType: String!) {
    defaultOfferLetterTerms(letterType: $letterType)
  }
`

export async function fetchDefaultOfferLetterTerms(letterType: string): Promise<string[]> {
  const data = await gqlClient.request<{ defaultOfferLetterTerms: string[] }>(DEFAULT_TERMS_QUERY, { letterType })
  return data.defaultOfferLetterTerms
}

// ── Template Mutations ────────────────────────────────────────────────────

const CREATE_TEMPLATE_MUTATION = gql`
  mutation CreateOfferLetterTemplate($name: String!, $content: String!, $isDefault: Boolean) {
    createOfferLetterTemplate(name: $name, content: $content, isDefault: $isDefault) {
      id
      organisationId
      name
      content
      isDefault
      createdAt
      updatedAt
    }
  }
`

export async function createOfferLetterTemplate(
  name: string,
  content: string,
  isDefault?: boolean,
): Promise<OfferLetterTemplate> {
  const data = await gqlClient.request<{ createOfferLetterTemplate: OfferLetterTemplate }>(
    CREATE_TEMPLATE_MUTATION,
    { name, content, isDefault },
  )
  return data.createOfferLetterTemplate
}

const UPDATE_TEMPLATE_MUTATION = gql`
  mutation UpdateOfferLetterTemplate($id: String!, $name: String, $content: String, $isDefault: Boolean) {
    updateOfferLetterTemplate(id: $id, name: $name, content: $content, isDefault: $isDefault) {
      id
      organisationId
      name
      content
      isDefault
      createdAt
      updatedAt
    }
  }
`

export async function updateOfferLetterTemplate(
  id: string,
  fields: { name?: string; content?: string; isDefault?: boolean },
): Promise<OfferLetterTemplate> {
  const data = await gqlClient.request<{ updateOfferLetterTemplate: OfferLetterTemplate }>(
    UPDATE_TEMPLATE_MUTATION,
    { id, ...fields },
  )
  return data.updateOfferLetterTemplate
}

const DELETE_TEMPLATE_MUTATION = gql`
  mutation DeleteOfferLetterTemplate($id: String!) {
    deleteOfferLetterTemplate(id: $id)
  }
`

export async function deleteOfferLetterTemplate(id: string): Promise<boolean> {
  const data = await gqlClient.request<{ deleteOfferLetterTemplate: boolean }>(DELETE_TEMPLATE_MUTATION, { id })
  return data.deleteOfferLetterTemplate
}

// ── PDF Generation ────────────────────────────────────────────────────────

/**
 * Generate and download an offer/joining letter PDF for a specific user.
 * Uses the existing GET endpoint (backward-compatible, default template).
 */
export async function generateOfferLetterForUser(
  userId: string,
  letterType: 'offer' | 'joining' = 'offer',
): Promise<void> {
  const token = localStorage.getItem('authToken')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const url = `${API_BASE}/api/offer-letter/${userId}?letter_type=${letterType}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Failed to generate PDF (${response.status})`)
  }

  downloadPdfBlob(await response.blob(), response)
}

export interface GenerateOfferLetterOptions {
  letterType?: 'offer' | 'joining'
  openingParagraph?: string
  terms?: string[]
  additionalNotes?: string
}

/**
 * Generate an offer/joining letter PDF with optional custom fields.
 * Uses the POST endpoint. Receptionists provide plain text fields --
 * the backend handles LaTeX rendering internally.
 */
export async function generateOfferLetter(
  userId: string,
  options: GenerateOfferLetterOptions = {},
): Promise<void> {
  const token = localStorage.getItem('authToken')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/offer-letter/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      letter_type: options.letterType ?? 'offer',
      opening_paragraph: options.openingParagraph || null,
      terms: options.terms && options.terms.length > 0 ? options.terms : null,
      additional_notes: options.additionalNotes || null,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Failed to generate PDF (${response.status})`)
  }

  downloadPdfBlob(await response.blob(), response)
}

function downloadPdfBlob(blob: Blob, response: Response) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download =
    response.headers
      .get('content-disposition')
      ?.match(/filename="(.+)"/)?.[1] || 'offer_letter.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
