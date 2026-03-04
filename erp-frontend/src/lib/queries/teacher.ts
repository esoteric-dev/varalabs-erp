import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface TeacherClass {
  id: string
  userId: string
  userName: string
  className: string
  isClassTeacher: boolean
}

export interface StudentProgress {
  id: string
  name: string
  className: string
  attendancePresent: number
  attendanceTotal: number
  attendanceRate: number
  feesPaid: number
  feesPending: number
}

export interface MyPayslip {
  id: string
  month: number
  year: number
  runStatus: string
  basicPay: number
  allowances: number
  deductions: number
  netPay: number
}

const MY_CLASSES_QUERY = gql`
  query MyClasses {
    myClasses {
      id
      userId
      userName
      className
      isClassTeacher
    }
  }
`

const MY_STUDENTS_QUERY = gql`
  query MyStudents($className: String) {
    myStudents(className: $className) {
      id
      name
      className
      attendancePresent
      attendanceTotal
      attendanceRate
      feesPaid
      feesPending
    }
  }
`

const MY_PAYSLIPS_QUERY = gql`
  query MyPayslips {
    myPayslips {
      id
      month
      year
      runStatus
      basicPay
      allowances
      deductions
      netPay
    }
  }
`

export async function fetchMyClasses(): Promise<TeacherClass[]> {
  const data = await gqlClient.request<{ myClasses: TeacherClass[] }>(MY_CLASSES_QUERY)
  return data.myClasses
}

export async function fetchMyStudents(className?: string): Promise<StudentProgress[]> {
  const data = await gqlClient.request<{ myStudents: StudentProgress[] }>(MY_STUDENTS_QUERY, { className })
  return data.myStudents
}

export async function fetchMyPayslips(): Promise<MyPayslip[]> {
  const data = await gqlClient.request<{ myPayslips: MyPayslip[] }>(MY_PAYSLIPS_QUERY)
  return data.myPayslips
}

const TEACHER_CLASS_ASSIGNMENTS_QUERY = gql`
  query TeacherClassAssignments($userId: String) {
    teacherClassAssignments(userId: $userId) {
      id
      userId
      userName
      className
      isClassTeacher
    }
  }
`

const ASSIGN_CLASS_MUTATION = gql`
  mutation AssignClassToTeacher($userId: String!, $className: String!, $isClassTeacher: Boolean) {
    assignClassToTeacher(userId: $userId, className: $className, isClassTeacher: $isClassTeacher) {
      id
      userId
      userName
      className
      isClassTeacher
    }
  }
`

const REMOVE_CLASS_MUTATION = gql`
  mutation RemoveClassFromTeacher($assignmentId: String!) {
    removeClassFromTeacher(assignmentId: $assignmentId)
  }
`

export async function fetchTeacherClassAssignments(userId?: string): Promise<TeacherClass[]> {
  const data = await gqlClient.request<{ teacherClassAssignments: TeacherClass[] }>(TEACHER_CLASS_ASSIGNMENTS_QUERY, { userId })
  return data.teacherClassAssignments
}

export async function assignClassToTeacher(userId: string, className: string, isClassTeacher?: boolean): Promise<TeacherClass> {
  const data = await gqlClient.request<{ assignClassToTeacher: TeacherClass }>(ASSIGN_CLASS_MUTATION, { userId, className, isClassTeacher })
  return data.assignClassToTeacher
}

export async function removeClassFromTeacher(assignmentId: string): Promise<boolean> {
  const data = await gqlClient.request<{ removeClassFromTeacher: boolean }>(REMOVE_CLASS_MUTATION, { assignmentId })
  return data.removeClassFromTeacher
}
