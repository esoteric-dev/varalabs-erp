import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface StaffSalary {
  id: string
  userId: string
  userName: string
  basicPay: number
  allowances: number
  deductions: number
  effectiveFrom: string
}

export interface PayrollRun {
  id: string
  month: number
  year: number
  status: string
  totalGross: number
  totalNet: number
  processedAt: string | null
}

export interface PayrollEntry {
  id: string
  userName: string
  basicPay: number
  allowances: number
  deductions: number
  netPay: number
}

const STAFF_SALARIES_QUERY = gql`
  query StaffSalaries {
    staffSalaries {
      id
      userId
      userName
      basicPay
      allowances
      deductions
      effectiveFrom
    }
  }
`

const PAYROLL_RUNS_QUERY = gql`
  query PayrollRuns {
    payrollRuns {
      id
      month
      year
      status
      totalGross
      totalNet
      processedAt
    }
  }
`

const PAYROLL_ENTRIES_QUERY = gql`
  query PayrollEntries($runId: String!) {
    payrollEntries(runId: $runId) {
      id
      userName
      basicPay
      allowances
      deductions
      netPay
    }
  }
`

const CREATE_PAYROLL_RUN_MUTATION = gql`
  mutation CreatePayrollRun($month: Int!, $year: Int!) {
    createPayrollRun(month: $month, year: $year) {
      id
      month
      year
      status
      totalGross
      totalNet
      processedAt
    }
  }
`

export async function fetchStaffSalaries(): Promise<StaffSalary[]> {
  const data = await gqlClient.request<{ staffSalaries: StaffSalary[] }>(STAFF_SALARIES_QUERY)
  return data.staffSalaries
}

export async function fetchPayrollRuns(): Promise<PayrollRun[]> {
  const data = await gqlClient.request<{ payrollRuns: PayrollRun[] }>(PAYROLL_RUNS_QUERY)
  return data.payrollRuns
}

export async function fetchPayrollEntries(runId: string): Promise<PayrollEntry[]> {
  const data = await gqlClient.request<{ payrollEntries: PayrollEntry[] }>(PAYROLL_ENTRIES_QUERY, {
    runId,
  })
  return data.payrollEntries
}

export async function createPayrollRun(month: number, year: number): Promise<PayrollRun> {
  const data = await gqlClient.request<{ createPayrollRun: PayrollRun }>(
    CREATE_PAYROLL_RUN_MUTATION,
    { month, year },
  )
  return data.createPayrollRun
}
