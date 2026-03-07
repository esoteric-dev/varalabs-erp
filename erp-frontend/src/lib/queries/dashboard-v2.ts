import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceSummary {
  studentPresent: number
  studentAbsent: number
  studentLate: number
  studentTotal: number
  teacherPresent: number
  teacherAbsent: number
  teacherLate: number
  teacherTotal: number
  staffPresent: number
  staffAbsent: number
  staffLate: number
  staffTotal: number
}

export interface ClassRoutine {
  id: string
  teacherId: string
  teacherName: string
  className: string
  section?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room?: string
  subjectName?: string
  status: string
}

export interface ClassPerformance {
  className: string
  topCount: number
  averageCount: number
  belowAverageCount: number
}

export interface SubjectProgress {
  subjectName: string
  className?: string
  studentCount: number
}

export interface BestPerformer {
  userId: string
  name: string
  role: string
  className?: string
  metricLabel: string
  metricValue: string
}

// ── Queries ──────────────────────────────────────────────────────────────────

const ATTENDANCE_SUMMARY_QUERY = gql`
  query AttendanceSummary($period: String) {
    attendanceSummary(period: $period) {
      studentPresent studentAbsent studentLate studentTotal
      teacherPresent teacherAbsent teacherLate teacherTotal
      staffPresent staffAbsent staffLate staffTotal
    }
  }
`

const CLASS_ROUTINES_QUERY = gql`
  query ClassRoutines($className: String) {
    classRoutines(className: $className) {
      id teacherId teacherName className section dayOfWeek
      startTime endTime room subjectName status
    }
  }
`

const CLASS_PERFORMANCE_QUERY = gql`
  query ClassPerformance($className: String) {
    classPerformance(className: $className) {
      className topCount averageCount belowAverageCount
    }
  }
`

const TOP_SUBJECTS_QUERY = gql`
  query TopSubjects($className: String) {
    topSubjects(className: $className) {
      subjectName className studentCount
    }
  }
`

const BEST_PERFORMERS_QUERY = gql`
  query BestPerformers {
    bestPerformers {
      userId name role className metricLabel metricValue
    }
  }
`

// ── Mutations ────────────────────────────────────────────────────────────────

const CREATE_CLASS_ROUTINE = gql`
  mutation CreateClassRoutine($input: CreateClassRoutineInput!) {
    createClassRoutine(input: $input) {
      id teacherId teacherName className section dayOfWeek
      startTime endTime room subjectName status
    }
  }
`

const DELETE_CLASS_ROUTINE = gql`
  mutation DeleteClassRoutine($id: String!) {
    deleteClassRoutine(id: $id)
  }
`

// ── Fetch Functions ──────────────────────────────────────────────────────────

export const fetchAttendanceSummary = async (period?: string): Promise<AttendanceSummary> => {
  const d = await gqlClient.request<{ attendanceSummary: AttendanceSummary }>(ATTENDANCE_SUMMARY_QUERY, { period })
  return d.attendanceSummary
}

export const fetchClassRoutines = async (className?: string): Promise<ClassRoutine[]> => {
  const d = await gqlClient.request<{ classRoutines: ClassRoutine[] }>(CLASS_ROUTINES_QUERY, { className })
  return d.classRoutines
}

export const fetchClassPerformance = async (className?: string): Promise<ClassPerformance> => {
  const d = await gqlClient.request<{ classPerformance: ClassPerformance }>(CLASS_PERFORMANCE_QUERY, { className })
  return d.classPerformance
}

export const fetchTopSubjects = async (className?: string): Promise<SubjectProgress[]> => {
  const d = await gqlClient.request<{ topSubjects: SubjectProgress[] }>(TOP_SUBJECTS_QUERY, { className })
  return d.topSubjects
}

export const fetchBestPerformers = async (): Promise<BestPerformer[]> => {
  const d = await gqlClient.request<{ bestPerformers: BestPerformer[] }>(BEST_PERFORMERS_QUERY)
  return d.bestPerformers
}

export const createClassRoutine = async (input: Omit<ClassRoutine, 'id' | 'teacherName' | 'status'>): Promise<ClassRoutine> => {
  const d = await gqlClient.request<{ createClassRoutine: ClassRoutine }>(CREATE_CLASS_ROUTINE, { input })
  return d.createClassRoutine
}

export const deleteClassRoutine = async (id: string): Promise<boolean> => {
  const d = await gqlClient.request<{ deleteClassRoutine: boolean }>(DELETE_CLASS_ROUTINE, { id })
  return d.deleteClassRoutine
}
