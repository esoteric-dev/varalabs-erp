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
    }
  }
`

export async function fetchReportSummary(): Promise<ReportSummary> {
  const data = await gqlClient.request<{ reportSummary: ReportSummary }>(REPORT_SUMMARY_QUERY)
  return data.reportSummary
}
