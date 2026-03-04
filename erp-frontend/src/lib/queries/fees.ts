import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface FeeStructure {
  id: string
  name: string
  amount: number
  frequency: string
  className: string | null
  academicYear: string
}

export interface FeeRecord {
  id: string
  studentId: string
  studentName: string
  feeName: string
  amountDue: number
  amountPaid: number
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived'
  dueDate: string
  paidDate: string | null
  paymentMode: string | null
}

const FEE_STRUCTURES_QUERY = gql`
  query FeeStructures {
    feeStructures {
      id
      name
      amount
      frequency
      className
      academicYear
    }
  }
`

const FEE_RECORDS_QUERY = gql`
  query FeeRecords($studentId: String) {
    feeRecords(studentId: $studentId) {
      id
      studentId
      studentName
      feeName
      amountDue
      amountPaid
      status
      dueDate
      paidDate
      paymentMode
    }
  }
`

const CREATE_FEE_STRUCTURE_MUTATION = gql`
  mutation CreateFeeStructure($name: String!, $amount: Int!, $frequency: String!, $className: String, $academicYear: String) {
    createFeeStructure(name: $name, amount: $amount, frequency: $frequency, className: $className, academicYear: $academicYear) {
      id
      name
      amount
      frequency
      className
      academicYear
    }
  }
`

const RECORD_FEE_PAYMENT_MUTATION = gql`
  mutation RecordFeePayment($feeRecordId: String!, $amount: Int!, $paymentMode: String!) {
    recordFeePayment(feeRecordId: $feeRecordId, amount: $amount, paymentMode: $paymentMode)
  }
`

export async function fetchFeeStructures(): Promise<FeeStructure[]> {
  const data = await gqlClient.request<{ feeStructures: FeeStructure[] }>(FEE_STRUCTURES_QUERY)
  return data.feeStructures
}

export async function fetchFeeRecords(studentId?: string): Promise<FeeRecord[]> {
  const data = await gqlClient.request<{ feeRecords: FeeRecord[] }>(FEE_RECORDS_QUERY, { studentId })
  return data.feeRecords
}

export async function createFeeStructure(
  name: string,
  amount: number,
  frequency: string,
  className?: string,
  academicYear?: string,
): Promise<FeeStructure> {
  const data = await gqlClient.request<{ createFeeStructure: FeeStructure }>(
    CREATE_FEE_STRUCTURE_MUTATION,
    { name, amount, frequency, className, academicYear },
  )
  return data.createFeeStructure
}

export async function recordFeePayment(
  feeRecordId: string,
  amount: number,
  paymentMode: string,
): Promise<boolean> {
  const data = await gqlClient.request<{ recordFeePayment: boolean }>(
    RECORD_FEE_PAYMENT_MUTATION,
    { feeRecordId, amount, paymentMode },
  )
  return data.recordFeePayment
}
