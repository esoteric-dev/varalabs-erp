import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface LeaveRequest {
  id: string
  userId: string
  userName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
  className?: string | null
}

const MY_LEAVE_REQUESTS_QUERY = gql`
  query MyLeaveRequests {
    myLeaveRequests {
      id
      userId
      userName
      leaveType
      startDate
      endDate
      reason
      status
      reviewedByName
      reviewedAt
      createdAt
    }
  }
`

const LEAVE_REQUESTS_QUERY = gql`
  query LeaveRequests {
    leaveRequests {
      id
      userId
      userName
      leaveType
      startDate
      endDate
      reason
      status
      reviewedByName
      reviewedAt
      createdAt
    }
  }
`

const APPLY_LEAVE_MUTATION = gql`
  mutation ApplyLeave($leaveType: String!, $startDate: String!, $endDate: String!, $reason: String!) {
    applyLeave(leaveType: $leaveType, startDate: $startDate, endDate: $endDate, reason: $reason) {
      id
      userId
      userName
      leaveType
      startDate
      endDate
      reason
      status
      createdAt
    }
  }
`

const REVIEW_LEAVE_MUTATION = gql`
  mutation ReviewLeave($id: String!, $status: String!) {
    reviewLeave(id: $id, status: $status)
  }
`

const STUDENT_LEAVE_REQUESTS_QUERY = gql`
  query StudentLeaveRequests {
    studentLeaveRequests {
      id
      userId
      userName
      leaveType
      startDate
      endDate
      reason
      status
      reviewedByName
      reviewedAt
      createdAt
      className
    }
  }
`

export async function fetchMyLeaveRequests(): Promise<LeaveRequest[]> {
  const data = await gqlClient.request<{ myLeaveRequests: LeaveRequest[] }>(MY_LEAVE_REQUESTS_QUERY)
  return data.myLeaveRequests
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const data = await gqlClient.request<{ leaveRequests: LeaveRequest[] }>(LEAVE_REQUESTS_QUERY)
  return data.leaveRequests
}

export async function applyLeave(
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
): Promise<LeaveRequest> {
  const data = await gqlClient.request<{ applyLeave: LeaveRequest }>(APPLY_LEAVE_MUTATION, {
    leaveType,
    startDate,
    endDate,
    reason,
  })
  return data.applyLeave
}

export async function reviewLeave(id: string, status: string): Promise<boolean> {
  const data = await gqlClient.request<{ reviewLeave: boolean }>(REVIEW_LEAVE_MUTATION, { id, status })
  return data.reviewLeave
}

export async function fetchStudentLeaveRequests(): Promise<LeaveRequest[]> {
  const data = await gqlClient.request<{ studentLeaveRequests: LeaveRequest[] }>(STUDENT_LEAVE_REQUESTS_QUERY)
  return data.studentLeaveRequests
}
