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
    }
  }
`

export async function fetchOrgUsers(): Promise<OrgUser[]> {
  const data = await gqlClient.request<{ orgUsers: OrgUser[] }>(ORG_USERS_QUERY)
  return data.orgUsers
}

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($name: String!, $email: String!, $phone: String, $systemRole: String, $password: String) {
    createUser(name: $name, email: $email, phone: $phone, systemRole: $systemRole, password: $password) {
      user {
        id
        name
        email
        systemRole
        phone
      }
      generatedPassword
    }
  }
`

export async function createUser(
  name: string,
  email: string,
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
  email: string
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
}

const ONBOARD_STAFF_MUTATION = gql`
  mutation OnboardStaff(
    $name: String!, $email: String!, $phone: String, $password: String,
    $designation: String, $department: String, $qualification: String,
    $dateOfBirth: String, $gender: String, $bloodGroup: String, $maritalStatus: String,
    $address: String, $city: String, $state: String, $zipCode: String, $country: String,
    $bankAccountName: String, $bankAccountNumber: String, $bankName: String, $bankIfsc: String, $bankBranch: String,
    $dateOfJoining: String,
    $basicPay: Int, $allowances: Int, $deductions: Int
  ) {
    onboardStaff(
      name: $name, email: $email, phone: $phone, password: $password,
      designation: $designation, department: $department, qualification: $qualification,
      dateOfBirth: $dateOfBirth, gender: $gender, bloodGroup: $bloodGroup, maritalStatus: $maritalStatus,
      address: $address, city: $city, state: $state, zipCode: $zipCode, country: $country,
      bankAccountName: $bankAccountName, bankAccountNumber: $bankAccountNumber,
      bankName: $bankName, bankIfsc: $bankIfsc, bankBranch: $bankBranch,
      dateOfJoining: $dateOfJoining,
      basicPay: $basicPay, allowances: $allowances, deductions: $deductions
    ) {
      user { id name email systemRole phone }
      employeeId
      generatedPassword
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
}

export async function fetchStaffDetail(userId: string): Promise<StaffDetail | null> {
  const data = await gqlClient.request<{ staffDetail: StaffDetail | null }>(STAFF_DETAIL_QUERY, { userId })
  return data.staffDetail
}
