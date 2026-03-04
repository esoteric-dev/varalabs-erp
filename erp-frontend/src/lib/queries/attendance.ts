import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'leave'
  remarks: string
  createdAt: string
}

const ATTENDANCE_RECORDS_QUERY = gql`
  query AttendanceRecords($date: String, $studentId: String, $className: String) {
    attendanceRecords(date: $date, studentId: $studentId, className: $className) {
      id
      studentId
      studentName
      date
      status
      remarks
      createdAt
    }
  }
`

const MARK_ATTENDANCE_MUTATION = gql`
  mutation MarkAttendance($studentId: String!, $date: String!, $status: String!, $remarks: String) {
    markAttendance(studentId: $studentId, date: $date, status: $status, remarks: $remarks) {
      id
      studentId
      studentName
      date
      status
      remarks
      createdAt
    }
  }
`

export async function fetchAttendanceRecords(date?: string, studentId?: string, className?: string): Promise<AttendanceRecord[]> {
  const data = await gqlClient.request<{ attendanceRecords: AttendanceRecord[] }>(
    ATTENDANCE_RECORDS_QUERY,
    { date, studentId, className },
  )
  return data.attendanceRecords
}

export async function markAttendance(
  studentId: string,
  date: string,
  status: string,
  remarks?: string,
): Promise<AttendanceRecord> {
  const data = await gqlClient.request<{ markAttendance: AttendanceRecord }>(
    MARK_ATTENDANCE_MUTATION,
    { studentId, date, status, remarks },
  )
  return data.markAttendance
}

const BULK_MARK_ATTENDANCE_MUTATION = gql`
  mutation BulkMarkAttendance($date: String!, $entries: [AttendanceEntry!]!) {
    bulkMarkAttendance(date: $date, entries: $entries)
  }
`

export async function bulkMarkAttendance(
  date: string,
  entries: { studentId: string; status: string }[],
): Promise<boolean> {
  const data = await gqlClient.request<{ bulkMarkAttendance: boolean }>(
    BULK_MARK_ATTENDANCE_MUTATION,
    { date, entries },
  )
  return data.bulkMarkAttendance
}
