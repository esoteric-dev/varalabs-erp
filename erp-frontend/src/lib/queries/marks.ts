import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Exam {
  id: string
  name: string
  className: string
  examDate?: string
  totalMarks: number
  status: string
}

export interface StudentMark {
  id: string
  studentId: string
  subjectId: string
  subjectName: string
  examId?: string
  examName?: string
  marksObtained: number
  totalMarks: number
  remarks?: string
}

// ── Queries ──────────────────────────────────────────────────────────────────

const EXAMS_QUERY = gql`
  query Exams($className: String) {
    exams(className: $className) { id name className examDate totalMarks status }
  }
`

const STUDENT_MARKS_QUERY = gql`
  query StudentMarks($studentId: String!, $examId: String) {
    studentMarks(studentId: $studentId, examId: $examId) {
      id studentId subjectId subjectName examId examName marksObtained totalMarks remarks
    }
  }
`

const MY_MARKS_QUERY = gql`
  query MyMarks($examId: String) {
    myMarks(examId: $examId) {
      id studentId subjectId subjectName examId examName marksObtained totalMarks remarks
    }
  }
`

// ── Mutations ────────────────────────────────────────────────────────────────

const CREATE_EXAM = gql`
  mutation CreateExam($input: CreateExamInput!) {
    createExam(input: $input) { id name className examDate totalMarks status }
  }
`

const ADD_STUDENT_MARK = gql`
  mutation AddStudentMark($input: AddStudentMarkInput!) {
    addStudentMark(input: $input) {
      id studentId subjectId subjectName examId examName marksObtained totalMarks remarks
    }
  }
`

const DELETE_STUDENT_MARK = gql`
  mutation DeleteStudentMark($id: String!) {
    deleteStudentMark(id: $id)
  }
`

// ── Fetch Functions ──────────────────────────────────────────────────────────

export const fetchExams = async (className?: string): Promise<Exam[]> => {
  const d = await gqlClient.request<{ exams: Exam[] }>(EXAMS_QUERY, { className })
  return d.exams
}

export const fetchStudentMarks = async (studentId: string, examId?: string): Promise<StudentMark[]> => {
  const d = await gqlClient.request<{ studentMarks: StudentMark[] }>(STUDENT_MARKS_QUERY, { studentId, examId })
  return d.studentMarks
}

export const fetchMyMarks = async (examId?: string): Promise<StudentMark[]> => {
  const d = await gqlClient.request<{ myMarks: StudentMark[] }>(MY_MARKS_QUERY, { examId })
  return d.myMarks
}

export const createExam = async (input: { name: string; className: string; examDate?: string; totalMarks?: number }): Promise<Exam> => {
  const d = await gqlClient.request<{ createExam: Exam }>(CREATE_EXAM, { input })
  return d.createExam
}

export const addStudentMark = async (input: {
  studentId: string
  subjectId: string
  examId?: string
  marksObtained: number
  totalMarks?: number
  remarks?: string
}): Promise<StudentMark> => {
  const d = await gqlClient.request<{ addStudentMark: StudentMark }>(ADD_STUDENT_MARK, { input })
  return d.addStudentMark
}

export const deleteStudentMark = async (id: string): Promise<boolean> => {
  const d = await gqlClient.request<{ deleteStudentMark: boolean }>(DELETE_STUDENT_MARK, { id })
  return d.deleteStudentMark
}
