import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface Student {
  id: string
  name: string
  className: string
  gender?: string
  dateOfBirth?: string
  bloodGroup?: string
  religion?: string
  email?: string
  phone?: string
  admissionNumber?: string
  admissionDate?: string
  loginEmail?: string
  userId?: string
  photoUrl?: string
}

export interface AddStudentResult {
  student: Student
  generatedEmail: string
  generatedPassword: string
}

export interface StudentOnboardingConfig {
  sections: {
    personalInfo: { enabled: boolean; mandatoryFields: string[] }
    parentsGuardian: { enabled: boolean; mandatoryFields: string[] }
    addressInfo: { enabled: boolean; mandatoryFields: string[] }
    transportHostel: { enabled: boolean; mandatoryFields: string[] }
    medicalHistory: { enabled: boolean; mandatoryFields: string[] }
    previousSchool: { enabled: boolean; mandatoryFields: string[] }
    otherDetails: { enabled: boolean; customFields: Array<{ id: string; label: string; type: string; required: boolean }> }
  }
}

export interface OrgSettings {
  studentOnboardingConfig: StudentOnboardingConfig
}

export interface AddStudentInput {
  name: string
  className: string
  gender?: string
  dateOfBirth?: string
  bloodGroup?: string
  religion?: string
  email?: string
  phone?: string
  admissionNumber?: string
  admissionDate?: string

  fatherName?: string
  fatherPhone?: string
  fatherOccupation?: string
  motherName?: string
  motherPhone?: string
  motherOccupation?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelation?: string
  guardianOccupation?: string
  guardianEmail?: string

  allergies?: string
  medications?: string
  pastConditions?: string

  previousSchoolName?: string
  previousSchoolAddress?: string

  currentAddress?: string
  currentCity?: string
  currentState?: string
  currentZipCode?: string
  currentCountry?: string

  permanentAddress?: string
  permanentCity?: string
  permanentState?: string
  permanentZipCode?: string
  permanentCountry?: string

  customData?: any
}

const STUDENTS_QUERY = gql`
  query Students {
    students {
      id
      name
      className
      admissionNumber
      loginEmail
      userId
      photoUrl
    }
  }
`

const STUDENT_QUERY = gql`
  query Student($id: String!) {
    student(id: $id) {
      id
      name
      className
      gender
      dateOfBirth
      bloodGroup
      religion
      email
      phone
      admissionNumber
      admissionDate
      loginEmail
      userId
      photoUrl
    }
  }
`

export async function fetchStudents(): Promise<Student[]> {
  const data = await gqlClient.request<{ students: Student[] }>(STUDENTS_QUERY)
  return data.students
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const data = await gqlClient.request<{ student: Student | null }>(STUDENT_QUERY, { id })
  return data.student
}

const CREATE_STUDENT_MUTATION = gql`
  mutation CreateStudent($name: String!, $className: String!) {
    createStudent(name: $name, className: $className) {
      id
      name
      className
    }
  }
`

const MY_STUDENT_QUERY = gql`
  query MyStudent {
    myStudent {
      id
      name
      className
      gender
      dateOfBirth
      bloodGroup
      religion
      email
      phone
      admissionNumber
      admissionDate
      loginEmail
      photoUrl
    }
  }
`

export async function fetchMyStudent(): Promise<Student | null> {
  const data = await gqlClient.request<{ myStudent: Student | null }>(MY_STUDENT_QUERY)
  return data.myStudent
}

export async function createStudent(name: string, className: string): Promise<Student> {
  const data = await gqlClient.request<{ createStudent: Student }>(
    CREATE_STUDENT_MUTATION,
    { name, className },
  )
  return data.createStudent
}

export const GET_ONBOARDING_CONFIG = gql`
  query GetOnboardingConfig {
    getOnboardingConfig {
      studentOnboardingConfig
    }
  }
`

export const UPDATE_ONBOARDING_CONFIG = gql`
  mutation UpdateOnboardingConfig($config: JSON!) {
    updateOnboardingConfig(config: $config)
  }
`

export const ADD_STUDENT_MUTATION = gql`
  mutation AddStudent($input: AddStudentInput!) {
    addStudent(input: $input) {
      student {
        id
        name
        className
        gender
        dateOfBirth
        bloodGroup
        religion
        email
        phone
        admissionNumber
        admissionDate
      }
      generatedEmail
      generatedPassword
    }
  }
`

export async function getOnboardingConfig(): Promise<StudentOnboardingConfig> {
  const data = await gqlClient.request<{ getOnboardingConfig: OrgSettings }>(GET_ONBOARDING_CONFIG)
  return data.getOnboardingConfig.studentOnboardingConfig
}

export async function updateOnboardingConfig(config: StudentOnboardingConfig): Promise<boolean> {
  const data = await gqlClient.request<{ updateOnboardingConfig: boolean }>(UPDATE_ONBOARDING_CONFIG, { config })
  return data.updateOnboardingConfig
}

export async function addStudent(input: AddStudentInput): Promise<AddStudentResult> {
  const data = await gqlClient.request<{ addStudent: AddStudentResult }>(ADD_STUDENT_MUTATION, { input })
  return data.addStudent
}

const NEXT_ADMISSION_NUMBER_QUERY = gql`
  query NextAdmissionNumber {
    nextAdmissionNumber
  }
`

export async function fetchNextAdmissionNumber(): Promise<string> {
  const data = await gqlClient.request<{ nextAdmissionNumber: string }>(NEXT_ADMISSION_NUMBER_QUERY)
  return data.nextAdmissionNumber
}

const CREATE_STUDENT_CREDENTIALS_MUTATION = gql`
  mutation CreateStudentCredentials($studentId: String!) {
    createStudentCredentials(studentId: $studentId) {
      student {
        id
        name
        className
        admissionNumber
        loginEmail
        userId
      }
      generatedEmail
      generatedPassword
    }
  }
`

export async function createStudentCredentials(studentId: string): Promise<AddStudentResult> {
  const data = await gqlClient.request<{ createStudentCredentials: AddStudentResult }>(
    CREATE_STUDENT_CREDENTIALS_MUTATION,
    { studentId },
  )
  return data.createStudentCredentials
}

// --- Update Student ---

export interface UpdateStudentInput {
  name?: string
  className?: string
  gender?: string
  dateOfBirth?: string
  bloodGroup?: string
  religion?: string
  email?: string
  phone?: string
  admissionNumber?: string
  admissionDate?: string
}

const UPDATE_STUDENT_MUTATION = gql`
  mutation UpdateStudent(
    $studentId: String!
    $name: String
    $className: String
    $gender: String
    $dateOfBirth: String
    $bloodGroup: String
    $religion: String
    $email: String
    $phone: String
    $admissionNumber: String
    $admissionDate: String
  ) {
    updateStudent(
      studentId: $studentId
      name: $name
      className: $className
      gender: $gender
      dateOfBirth: $dateOfBirth
      bloodGroup: $bloodGroup
      religion: $religion
      email: $email
      phone: $phone
      admissionNumber: $admissionNumber
      admissionDate: $admissionDate
    ) {
      id
      name
      className
      gender
      dateOfBirth
      bloodGroup
      religion
      email
      phone
      admissionNumber
      admissionDate
      loginEmail
      userId
      photoUrl
    }
  }
`

export async function updateStudent(
  studentId: string,
  fields: UpdateStudentInput,
): Promise<Student> {
  const data = await gqlClient.request<{ updateStudent: Student }>(
    UPDATE_STUDENT_MUTATION,
    { studentId, ...fields },
  )
  return data.updateStudent
}
