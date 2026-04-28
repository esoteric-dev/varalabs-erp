import { gql } from 'graphql-request'
import type { UserRole } from '../../routes/__root'
import { gqlClient } from '../graphql-client'
import { API_BASE } from '../api-base'

// --------------- Types ---------------

export interface CurrentUser {
  id: string
  name: string
  email: string
  systemRole: UserRole
  phone?: string
  photoUrl?: string
}

export interface OrgRole {
  id: string
  name: string
  slug: string
  isSystem: boolean
}

interface LoginResponse {
  token: string
  refreshToken: string
  user: CurrentUser
}

export interface SignupResponse {
  token: string
  refreshToken: string
  user: CurrentUser
  tenantId: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken: string
}

export interface CreateOrgResponse {
  organisation: {
    id: string
    tenantId: string
    name: string
    slug: string
    createdAt: string
  }
  adminEmail: string
  adminPassword: string
}

export interface Organisation {
  id: string
  tenantId: string
  name: string
  slug: string
  createdAt: string
  orgType?: string
}

export interface Service {
  id: string
  code: string
  name: string
  description?: string
  category: string
  icon?: string
  isActive: boolean
}

export interface ServiceWithStatus {
  id: string
  code: string
  name: string
  description?: string
  category: string
  icon?: string
  isEnabled: boolean
}

export interface CreateOrganisationInput {
  name: string
  slug: string
  orgType?: string
  serviceCodes?: string[]
}

export interface OrgInfo {
  orgId: string
  orgName: string
  orgSlug: string
  tenantName: string
}

export interface CustomDomain {
  id: string
  organisationId: string
  domain: string
  verified: boolean
  createdAt: string
}

export interface ResetPasswordResponse {
  success: boolean
  generatedPassword?: string
}

export interface OrgReportSummary {
  totalStudents: number
  totalStaff: number
  attendanceTodayPresent: number
  attendanceTodayTotal: number
  feesCollected: number
  feesPending: number
  pendingAdmissions: number
  activeNotices: number
}

// --------------- GraphQL Documents ---------------

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      systemRole
      phone
      photoUrl
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!, $orgSlug: String) {
    login(email: $email, password: $password, orgSlug: $orgSlug) {
      token
      refreshToken
      user {
        id
        name
        email
        systemRole
        phone
        photoUrl
      }
    }
  }
`

export const SIGNUP_MUTATION = gql`
  mutation Signup(
    $name: String!
    $email: String!
    $password: String!
  ) {
    signup(
      name: $name
      email: $email
      password: $password
    ) {
      token
      refreshToken
      user {
        id
        name
        email
        systemRole
        phone
        photoUrl
      }
      tenantId
    }
  }
`

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!, $orgSlug: String) {
    refreshToken(refreshToken: $refreshToken, orgSlug: $orgSlug) {
      token
      refreshToken
    }
  }
`

export const CREATE_ORGANISATION_MUTATION = gql`
  mutation CreateOrganisation($input: CreateOrganisationInput!) {
    createOrganisation(input: $input) {
      organisation {
        id
        tenantId
        name
        slug
        createdAt
        orgType
      }
      adminEmail
      adminPassword
    }
  }
`

export const RESOLVE_ORG_QUERY = gql`
  query ResolveOrg($slug: String, $host: String) {
    resolveOrg(slug: $slug, host: $host) {
      orgId
      orgName
      orgSlug
      tenantName
    }
  }
`

export const MY_ROLES_QUERY = gql`
  query MyRoles {
    myRoles {
      id
      name
      slug
      isSystem
    }
  }
`

export const MY_PERMISSIONS_QUERY = gql`
  query MyPermissions {
    myPermissions
  }
`

export const MY_EMPLOYEE_ID_QUERY = gql`
  query MyEmployeeId {
    myEmployeeId
  }
`

export const ORGANISATIONS_QUERY = gql`
  query Organisations {
    organisations {
      id
      tenantId
      name
      slug
      createdAt
    }
  }
`

export const CUSTOM_DOMAINS_QUERY = gql`
  query CustomDomains($organisationId: String!) {
    customDomains(organisationId: $organisationId) {
      id
      organisationId
      domain
      verified
      createdAt
    }
  }
`

export const ADD_CUSTOM_DOMAIN_MUTATION = gql`
  mutation AddCustomDomain($organisationId: String!, $domain: String!) {
    addCustomDomain(organisationId: $organisationId, domain: $domain) {
      id
      organisationId
      domain
      verified
      createdAt
    }
  }
`

export const REMOVE_CUSTOM_DOMAIN_MUTATION = gql`
  mutation RemoveCustomDomain($domainId: String!) {
    removeCustomDomain(domainId: $domainId)
  }
`

export const ORG_REPORT_SUMMARY_QUERY = gql`
  query OrgReportSummary($organisationId: String!) {
    orgReportSummary(organisationId: $organisationId) {
      totalStudents
      totalStaff
      attendanceTodayPresent
      attendanceTodayTotal
      feesCollected
      feesPending
      pendingAdmissions
      activeNotices
    }
  }
`

export const ORG_ADMIN_USER_QUERY = gql`
  query OrgAdminUser($organisationId: String!) {
    orgAdminUser(organisationId: $organisationId) {
      id
      name
      email
      systemRole
      phone
      photoUrl
    }
  }
`

export const RESET_ORG_ADMIN_PASSWORD_MUTATION = gql`
  mutation ResetOrgAdminPassword($userId: String!, $newPassword: String) {
    resetOrgAdminPassword(userId: $userId, newPassword: $newPassword) {
      success
      generatedPassword
    }
  }
`

export const RESET_USER_PASSWORD_MUTATION = gql`
  mutation ResetUserPassword($userId: String!, $newPassword: String) {
    resetUserPassword(userId: $userId, newPassword: $newPassword) {
      success
      generatedPassword
    }
  }
`

export const UPDATE_MY_PROFILE_MUTATION = gql`
  mutation UpdateMyProfile($name: String, $phone: String) {
    updateMyProfile(name: $name, phone: $phone) {
      id
      name
      email
      systemRole
      phone
      photoUrl
    }
  }
`

export const SERVICES_QUERY = gql`
  query Services {
    services {
      id
      code
      name
      description
      category
      icon
      isActive
    }
  }
`

export const ORGANISATION_SERVICES_QUERY = gql`
  query OrganisationServices($organisationId: String!) {
    organisationServices(organisationId: $organisationId) {
      id
      code
      name
      description
      category
      icon
      isEnabled
    }
  }
`

export const UPDATE_ORGANISATION_SERVICES_MUTATION = gql`
  mutation UpdateOrganisationServices(
    $organisationId: String!
    $serviceCodes: [String!]!
    $enabled: Boolean!
  ) {
    updateOrganisationServices(
      organisationId: $organisationId
      serviceCodes: $serviceCodes
      enabled: $enabled
    )
  }
`

export const UPDATE_ORGANISATION_MUTATION = gql`
  mutation UpdateOrganisation(
    $id: String!
    $name: String
    $orgType: String
  ) {
    updateOrganisation(id: $id, name: $name, orgType: $orgType) {
      id
      tenantId
      name
      slug
      createdAt
      orgType
    }
  }
`

// --------------- Fetch Functions ---------------

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const data = await gqlClient.request<{ me: CurrentUser }>(ME_QUERY)
  return data.me
}

export async function loginUser(
  email: string,
  password: string,
  orgSlug?: string | null,
): Promise<LoginResponse> {
  const data = await gqlClient.request<{ login: LoginResponse }>(LOGIN_MUTATION, {
    email,
    password,
    orgSlug: orgSlug ?? null,
  })
  return data.login
}

export async function refreshAccessToken(
  refreshToken: string,
  orgSlug?: string | null,
): Promise<RefreshTokenResponse> {
  const data = await gqlClient.request<{ refreshToken: RefreshTokenResponse }>(
    REFRESH_TOKEN_MUTATION,
    {
      refreshToken,
      orgSlug: orgSlug ?? null,
    },
  )
  return data.refreshToken
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
): Promise<SignupResponse> {
  const data = await gqlClient.request<{ signup: SignupResponse }>(SIGNUP_MUTATION, {
    name,
    email,
    password,
  })
  return data.signup
}

export async function createOrganisation(
  name: string,
  slug: string,
  orgType?: string,
  serviceCodes?: string[],
): Promise<CreateOrgResponse> {
  const data = await gqlClient.request<{ createOrganisation: CreateOrgResponse }>(
    CREATE_ORGANISATION_MUTATION,
    { input: { name, slug, orgType, serviceCodes } },
  )
  return data.createOrganisation
}

export async function fetchOrganisations(): Promise<Organisation[]> {
  const data = await gqlClient.request<{ organisations: Organisation[] }>(ORGANISATIONS_QUERY)
  return data.organisations
}

export async function resolveOrg(
  slug?: string | null,
  host?: string | null,
): Promise<OrgInfo | null> {
  const data = await gqlClient.request<{ resolveOrg: OrgInfo | null }>(RESOLVE_ORG_QUERY, {
    slug: slug ?? null,
    host: host ?? null,
  })
  return data.resolveOrg
}

export async function fetchMyRoles(): Promise<OrgRole[]> {
  const data = await gqlClient.request<{ myRoles: OrgRole[] }>(MY_ROLES_QUERY)
  return data.myRoles
}

export async function fetchMyPermissions(): Promise<string[]> {
  const data = await gqlClient.request<{ myPermissions: string[] }>(MY_PERMISSIONS_QUERY)
  return data.myPermissions
}

export async function fetchMyEmployeeId(): Promise<string | null> {
  const data = await gqlClient.request<{ myEmployeeId: string | null }>(MY_EMPLOYEE_ID_QUERY)
  return data.myEmployeeId
}

export async function fetchCustomDomains(organisationId: string): Promise<CustomDomain[]> {
  const data = await gqlClient.request<{ customDomains: CustomDomain[] }>(
    CUSTOM_DOMAINS_QUERY,
    { organisationId },
  )
  return data.customDomains
}

export async function addCustomDomain(
  organisationId: string,
  domain: string,
): Promise<CustomDomain> {
  const data = await gqlClient.request<{ addCustomDomain: CustomDomain }>(
    ADD_CUSTOM_DOMAIN_MUTATION,
    { organisationId, domain },
  )
  return data.addCustomDomain
}

export async function removeCustomDomain(domainId: string): Promise<boolean> {
  const data = await gqlClient.request<{ removeCustomDomain: boolean }>(
    REMOVE_CUSTOM_DOMAIN_MUTATION,
    { domainId },
  )
  return data.removeCustomDomain
}

export async function fetchOrgReportSummary(organisationId: string): Promise<OrgReportSummary> {
  const data = await gqlClient.request<{ orgReportSummary: OrgReportSummary }>(
    ORG_REPORT_SUMMARY_QUERY,
    { organisationId },
  )
  return data.orgReportSummary
}

export async function fetchOrgAdminUser(organisationId: string): Promise<CurrentUser | null> {
  const data = await gqlClient.request<{ orgAdminUser: CurrentUser | null }>(
    ORG_ADMIN_USER_QUERY,
    { organisationId },
  )
  return data.orgAdminUser
}

export async function resetOrgAdminPassword(
  userId: string,
  newPassword?: string,
): Promise<ResetPasswordResponse> {
  const data = await gqlClient.request<{ resetOrgAdminPassword: ResetPasswordResponse }>(
    RESET_ORG_ADMIN_PASSWORD_MUTATION,
    { userId, newPassword: newPassword ?? null },
  )
  return data.resetOrgAdminPassword
}

export async function resetUserPassword(
  userId: string,
  newPassword?: string,
): Promise<ResetPasswordResponse> {
  const data = await gqlClient.request<{ resetUserPassword: ResetPasswordResponse }>(
    RESET_USER_PASSWORD_MUTATION,
    { userId, newPassword: newPassword ?? null },
  )
  return data.resetUserPassword
}

export async function updateMyProfile(
  name?: string,
  phone?: string,
): Promise<CurrentUser> {
  const data = await gqlClient.request<{ updateMyProfile: CurrentUser }>(
    UPDATE_MY_PROFILE_MUTATION,
    { name: name ?? null, phone: phone ?? null },
  )
  return data.updateMyProfile
}

export async function uploadMyPhoto(blob: Blob): Promise<{ photoUrl: string; sizeBytes: number }> {
  const token = localStorage.getItem('authToken')
  const formData = new FormData()
  formData.append('photo', blob, 'photo.webp')

  const res = await fetch(`${API_BASE}/api/me/photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error || 'Upload failed')
  }

  return res.json()
}

export async function fetchServices(): Promise<Service[]> {
  const data = await gqlClient.request<{ services: Service[] }>(SERVICES_QUERY)
  return data.services
}

export async function fetchOrganisationServices(organisationId: string): Promise<ServiceWithStatus[]> {
  const data = await gqlClient.request<{ organisationServices: ServiceWithStatus[] }>(
    ORGANISATION_SERVICES_QUERY,
    { organisationId },
  )
  return data.organisationServices
}

export async function updateOrganisationServices(
  organisationId: string,
  serviceCodes: string[],
  enabled: boolean,
): Promise<boolean> {
  const data = await gqlClient.request<{ updateOrganisationServices: boolean }>(
    UPDATE_ORGANISATION_SERVICES_MUTATION,
    { organisationId, serviceCodes, enabled },
  )
  return data.updateOrganisationServices
}

export async function updateOrganisation(
  id: string,
  name?: string,
  orgType?: string,
): Promise<Organisation> {
  const data = await gqlClient.request<{ updateOrganisation: Organisation }>(
    UPDATE_ORGANISATION_MUTATION,
    { id, name: name ?? null, orgType: orgType ?? null },
  )
  return data.updateOrganisation
}
