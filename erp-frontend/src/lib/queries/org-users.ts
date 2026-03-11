import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface OrgUser {
  id: string
  name: string
  email: string
  systemRole: string
  phone: string | null
  roleNames: string | null
  employeeId: string | null
  photoUrl: string | null
}

export interface CreateUserResult {
  user: {
    id: string
    name: string
    email: string
    systemRole: string
    phone: string | null
  }
  generatedPassword: string | null
  generatedEmail: string | null
}

const ORG_USERS_QUERY = gql`
  query OrgUsers {
    orgUsers {
      id
      name
      email
      systemRole
      phone
      roleNames
      employeeId
      photoUrl
    }
  }
`

export async function fetchOrgUsers(): Promise<OrgUser[]> {
  const data = await gqlClient.request<{ orgUsers: OrgUser[] }>(ORG_USERS_QUERY)
  return data.orgUsers
}

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($name: String!, $email: String, $phone: String, $systemRole: String, $password: String) {
    createUser(name: $name, email: $email, phone: $phone, systemRole: $systemRole, password: $password) {
      user {
        id
        name
        email
        systemRole
        phone
      }
      generatedPassword
      generatedEmail
    }
  }
`

export async function createUser(
  name: string,
  email?: string,
  phone?: string,
  systemRole?: string,
  password?: string,
): Promise<CreateUserResult> {
  const data = await gqlClient.request<{
    createUser: CreateUserResult
  }>(CREATE_USER_MUTATION, { name, email, phone, systemRole, password })
  return data.createUser
}

export interface OnboardStaffInput {
  name: string
  email?: string
  phone?: string
  password?: string
  designation?: string
  department?: string
  qualification?: string
  dateOfBirth?: string
  gender?: string
  bloodGroup?: string
  maritalStatus?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankName?: string
  bankIfsc?: string
  bankBranch?: string
  dateOfJoining?: string
  personalEmail?: string
  basicPay?: number
  allowances?: number
  deductions?: number
}

export interface OnboardStaffResult {
  user: {
    id: string
    name: string
    email: string
    systemRole: string
    phone: string | null
  }
  employeeId: string
  generatedPassword: string | null
  generatedEmail: string | null
}

const ONBOARD_STAFF_MUTATION = gql`
  mutation OnboardStaff(
    $name: String!, $email: String, $phone: String, $password: String,
    $designation: String, $department: String, $qualification: String,
    $dateOfBirth: String, $gender: String, $bloodGroup: String, $maritalStatus: String,
    $address: String, $city: String, $state: String, $zipCode: String, $country: String,
    $bankAccountName: String, $bankAccountNumber: String, $bankName: String, $bankIfsc: String, $bankBranch: String,
    $dateOfJoining: String, $personalEmail: String,
    $basicPay: Int, $allowances: Int, $deductions: Int
  ) {
    onboardStaff(
      name: $name, email: $email, phone: $phone, password: $password,
      designation: $designation, department: $department, qualification: $qualification,
      dateOfBirth: $dateOfBirth, gender: $gender, bloodGroup: $bloodGroup, maritalStatus: $maritalStatus,
      address: $address, city: $city, state: $state, zipCode: $zipCode, country: $country,
      bankAccountName: $bankAccountName, bankAccountNumber: $bankAccountNumber,
      bankName: $bankName, bankIfsc: $bankIfsc, bankBranch: $bankBranch,
      dateOfJoining: $dateOfJoining, personalEmail: $personalEmail,
      basicPay: $basicPay, allowances: $allowances, deductions: $deductions
    ) {
      user { id name email systemRole phone }
      employeeId
      generatedPassword
      generatedEmail
    }
  }
`

export async function onboardStaff(input: OnboardStaffInput): Promise<OnboardStaffResult> {
  const data = await gqlClient.request<{ onboardStaff: OnboardStaffResult }>(
    ONBOARD_STAFF_MUTATION,
    input,
  )
  return data.onboardStaff
}

const STAFF_DETAIL_QUERY = gql`
  query StaffDetail($userId: String!) {
    staffDetail(userId: $userId) {
      userId
      designation
      department
      qualification
      dateOfBirth
      gender
      bloodGroup
      maritalStatus
      address
      city
      state
      zipCode
      country
      bankAccountName
      bankAccountNumber
      bankName
      bankIfsc
      bankBranch
      dateOfJoining
      personalEmail
    }
  }
`

export interface StaffDetail {
  userId: string
  designation: string | null
  department: string | null
  qualification: string | null
  dateOfBirth: string | null
  gender: string | null
  bloodGroup: string | null
  maritalStatus: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankName: string | null
  bankIfsc: string | null
  bankBranch: string | null
  dateOfJoining: string | null
  personalEmail: string | null
}

export async function fetchStaffDetail(userId: string): Promise<StaffDetail | null> {
  const data = await gqlClient.request<{ staffDetail: StaffDetail | null }>(STAFF_DETAIL_QUERY, { userId })
  return data.staffDetail
}

// --- Fetch Single Org User ---

const ORG_USER_QUERY = gql`
  query OrgUser($userId: String!) {
    orgUser(userId: $userId) {
      id
      name
      email
      systemRole
      phone
      roleNames
      employeeId
      photoUrl
    }
  }
`

export async function fetchOrgUser(userId: string): Promise<OrgUser | null> {
  const data = await gqlClient.request<{ orgUser: OrgUser | null }>(ORG_USER_QUERY, { userId })
  return data.orgUser
}

// --- Update User Mutation ---

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($userId: String!, $name: String, $email: String, $phone: String) {
    updateUser(userId: $userId, name: $name, email: $email, phone: $phone) {
      id
      name
      email
      systemRole
      phone
      photoUrl
    }
  }
`

export async function updateUser(
  userId: string,
  fields: { name?: string; email?: string; phone?: string },
): Promise<{ id: string; name: string; email: string; systemRole: string; phone: string | null; photoUrl: string | null }> {
  const data = await gqlClient.request<{ updateUser: { id: string; name: string; email: string; systemRole: string; phone: string | null; photoUrl: string | null } }>(
    UPDATE_USER_MUTATION,
    { userId, ...fields },
  )
  return data.updateUser
}

// --- Update Staff Details Mutation ---

const UPDATE_STAFF_DETAILS_MUTATION = gql`
  mutation UpdateStaffDetails(
    $userId: String!
    $designation: String
    $department: String
    $qualification: String
    $dateOfBirth: String
    $gender: String
    $bloodGroup: String
    $maritalStatus: String
    $address: String
    $city: String
    $state: String
    $zipCode: String
    $country: String
    $bankAccountName: String
    $bankAccountNumber: String
    $bankName: String
    $bankIfsc: String
    $bankBranch: String
    $dateOfJoining: String
    $personalEmail: String
  ) {
    updateStaffDetails(
      userId: $userId
      designation: $designation
      department: $department
      qualification: $qualification
      dateOfBirth: $dateOfBirth
      gender: $gender
      bloodGroup: $bloodGroup
      maritalStatus: $maritalStatus
      address: $address
      city: $city
      state: $state
      zipCode: $zipCode
      country: $country
      bankAccountName: $bankAccountName
      bankAccountNumber: $bankAccountNumber
      bankName: $bankName
      bankIfsc: $bankIfsc
      bankBranch: $bankBranch
      dateOfJoining: $dateOfJoining
      personalEmail: $personalEmail
    ) {
      userId
      designation
      department
      qualification
      dateOfBirth
      gender
      bloodGroup
      maritalStatus
      address
      city
      state
      zipCode
      country
      bankAccountName
      bankAccountNumber
      bankName
      bankIfsc
      bankBranch
      dateOfJoining
      personalEmail
    }
  }
`

export async function updateStaffDetails(
  userId: string,
  details: Partial<Omit<StaffDetail, 'userId'>>,
): Promise<StaffDetail> {
  const data = await gqlClient.request<{ updateStaffDetails: StaffDetail }>(
    UPDATE_STAFF_DETAILS_MUTATION,
    { userId, ...details },
  )
  return data.updateStaffDetails
}

// --- Preview Login Email ---

const PREVIEW_LOGIN_EMAIL_QUERY = gql`
  query PreviewLoginEmail($name: String!) {
    previewLoginEmail(name: $name)
  }
`

export async function previewLoginEmail(name: string): Promise<string> {
  const data = await gqlClient.request<{ previewLoginEmail: string }>(PREVIEW_LOGIN_EMAIL_QUERY, { name })
  return data.previewLoginEmail
}
