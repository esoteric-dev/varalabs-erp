import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface Notice {
  id: string
  title: string
  body: string
  audience: string
  priority: string
  published: boolean
  createdByName: string
  createdAt: string
  targetClasses: string | null
}

const NOTICES_QUERY = gql`
  query Notices {
    notices {
      id
      title
      body
      audience
      priority
      published
      createdByName
      createdAt
      targetClasses
    }
  }
`

const CREATE_NOTICE_MUTATION = gql`
  mutation CreateNotice($title: String!, $body: String!, $audience: String!, $priority: String, $targetClasses: String) {
    createNotice(title: $title, body: $body, audience: $audience, priority: $priority, targetClasses: $targetClasses) {
      id
      title
      body
      audience
      priority
      published
      createdByName
      createdAt
      targetClasses
    }
  }
`

const UPDATE_NOTICE_MUTATION = gql`
  mutation UpdateNotice($id: String!, $title: String, $body: String, $audience: String, $priority: String, $published: Boolean) {
    updateNotice(id: $id, title: $title, body: $body, audience: $audience, priority: $priority, published: $published)
  }
`

export async function fetchNotices(): Promise<Notice[]> {
  const data = await gqlClient.request<{ notices: Notice[] }>(NOTICES_QUERY)
  return data.notices
}

export async function createNotice(
  title: string,
  body: string,
  audience: string,
  priority?: string,
  targetClasses?: string,
): Promise<Notice> {
  const data = await gqlClient.request<{ createNotice: Notice }>(CREATE_NOTICE_MUTATION, {
    title,
    body,
    audience,
    priority,
    targetClasses,
  })
  return data.createNotice
}

export async function updateNotice(
  id: string,
  updates: {
    title?: string
    body?: string
    audience?: string
    priority?: string
    published?: boolean
  },
): Promise<boolean> {
  const data = await gqlClient.request<{ updateNotice: boolean }>(UPDATE_NOTICE_MUTATION, {
    id,
    ...updates,
  })
  return data.updateNotice
}
