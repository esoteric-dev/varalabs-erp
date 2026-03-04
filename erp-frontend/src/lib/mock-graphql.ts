import type { UserRole } from '../routes/__root'

export interface MockUser {
  id: string
  name: string
  email: string
  systemRole: UserRole
  phone?: string
}

interface LoginResponse {
  token: string
  user: MockUser
}

const userDirectory: Record<string, MockUser> = {
  'admin@greenwood.edu': {
    id: 'usr-001',
    name: 'Admin User',
    email: 'admin@greenwood.edu',
    systemRole: 'user',
    phone: '+91 98765 43210',
  },
  'superadmin@synapse.edu': {
    id: 'usr-002',
    name: 'System Administrator',
    email: 'superadmin@synapse.edu',
    systemRole: 'superadmin',
    phone: '+91 99999 00000',
  },
  'teacher@greenwood.edu': {
    id: 'usr-003',
    name: 'Lakshmi Narayan',
    email: 'teacher@greenwood.edu',
    systemRole: 'user',
    phone: '+91 98765 12345',
  },
  'student@greenwood.edu': {
    id: 'usr-004',
    name: 'Aarav Sharma',
    email: 'student@greenwood.edu',
    systemRole: 'user',
  },
  'parent@greenwood.edu': {
    id: 'usr-005',
    name: 'Raj Sharma',
    email: 'parent@greenwood.edu',
    systemRole: 'user',
    phone: '+91 98765 43210',
  },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Encode email into a base64 token so mockMe can decode it later.
 */
function encodeToken(email: string): string {
  return 'mock-jwt-' + btoa(email) + '-' + Date.now()
}

function decodeEmail(token: string): string | null {
  const match = token.match(/^mock-jwt-(.+)-\d+$/)
  if (!match) return null
  try {
    return atob(match[1])
  } catch {
    return null
  }
}

function resolveUser(email: string): MockUser {
  return (
    userDirectory[email] ?? {
      id: 'usr-999',
      name: 'Staff User',
      email,
      systemRole: 'user' as UserRole,
    }
  )
}

/**
 * Mock login mutation — accepts any non-empty credentials.
 */
export async function mockLogin(email: string, _password: string): Promise<LoginResponse> {
  await delay(400)

  if (!email) throw new Error('Email is required')

  const user = resolveUser(email)
  const token = encodeToken(email)

  return { token, user }
}

/**
 * Mock me query — decodes the token to find the user.
 */
export async function mockMe(token: string): Promise<MockUser> {
  await delay(200)

  const email = decodeEmail(token)
  if (!email) throw new Error('Invalid token')

  return resolveUser(email)
}
