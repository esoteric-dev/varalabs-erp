import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface ReportSummary {
  totalStudents: number
  totalStaff: number
  attendanceTodayPresent: number
  attendanceTodayTotal: number
  feesCollected: number
  feesPending: number
  pendingAdmissions: number
  activeNotices: number
  activeStudents: number
  inactiveStudents: number
  totalTeachers: number
  activeTeachers: number
  inactiveTeachers: number
  activeStaff: number
  inactiveStaff: number
  totalSubjects: number
  activeSubjects: number
  inactiveSubjects: number
  feesFine: number
  feesOutstanding: number
  attendanceTodayLate: number
  totalEarnings: number
  totalExpenses: number
}

const REPORT_SUMMARY_QUERY = gql`
  query ReportSummary {
    reportSummary {
      totalStudents
      totalStaff
      attendanceTodayPresent
      attendanceTodayTotal
      feesCollected
      feesPending
      pendingAdmissions
      activeNotices
      activeStudents
      inactiveStudents
      totalTeachers
      activeTeachers
      inactiveTeachers
      activeStaff
      inactiveStaff
      totalSubjects
      activeSubjects
      inactiveSubjects
      feesFine
      feesOutstanding
      attendanceTodayLate
      totalEarnings
      totalExpenses
    }
  }
`

export async function fetchReportSummary(): Promise<ReportSummary> {
  const data = await gqlClient.request<{ reportSummary: ReportSummary }>(REPORT_SUMMARY_QUERY)
  return data.reportSummary
}
