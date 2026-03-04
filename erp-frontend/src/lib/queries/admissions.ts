import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface AdmissionApplication {
  id: string
  studentName: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string | null
  appliedClass: string
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'waitlisted'
  academicYear: string
  notes: string
  submittedAt: string
}

const ADMISSIONS_QUERY = gql`
  query AdmissionApplications {
    admissionApplications {
      id
      studentName
      guardianName
      guardianPhone
      guardianEmail
      appliedClass
      status
      academicYear
      notes
      submittedAt
    }
  }
`

const CREATE_ADMISSION_MUTATION = gql`
  mutation CreateAdmission(
    $studentName: String!
    $guardianName: String!
    $guardianPhone: String!
    $guardianEmail: String
    $appliedClass: String!
    $academicYear: String
    $notes: String
  ) {
    createAdmission(
      studentName: $studentName
      guardianName: $guardianName
      guardianPhone: $guardianPhone
      guardianEmail: $guardianEmail
      appliedClass: $appliedClass
      academicYear: $academicYear
      notes: $notes
    ) {
      id
      studentName
      status
    }
  }
`

const UPDATE_ADMISSION_STATUS_MUTATION = gql`
  mutation UpdateAdmissionStatus($id: String!, $status: String!) {
    updateAdmissionStatus(id: $id, status: $status)
  }
`

export async function fetchAdmissions(): Promise<AdmissionApplication[]> {
  const data = await gqlClient.request<{ admissionApplications: AdmissionApplication[] }>(
    ADMISSIONS_QUERY,
  )
  return data.admissionApplications
}

export async function createAdmission(input: {
  studentName: string
  guardianName: string
  guardianPhone: string
  guardianEmail?: string
  appliedClass: string
  academicYear?: string
  notes?: string
}): Promise<AdmissionApplication> {
  const data = await gqlClient.request<{ createAdmission: AdmissionApplication }>(
    CREATE_ADMISSION_MUTATION,
    input,
  )
  return data.createAdmission
}

export async function updateAdmissionStatus(id: string, status: string): Promise<boolean> {
  const data = await gqlClient.request<{ updateAdmissionStatus: boolean }>(
    UPDATE_ADMISSION_STATUS_MUTATION,
    { id, status },
  )
  return data.updateAdmissionStatus
}
