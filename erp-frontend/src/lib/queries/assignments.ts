import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface Assignment {
  id: string
  title: string
  description: string
  className: string
  subject: string | null
  assignedByName: string
  dueDate: string | null
  createdAt: string
}

const ASSIGNMENTS_QUERY = gql`
  query Assignments($className: String) {
    assignments(className: $className) {
      id
      title
      description
      className
      subject
      assignedByName
      dueDate
      createdAt
    }
  }
`

const CREATE_ASSIGNMENT_MUTATION = gql`
  mutation CreateAssignment($title: String!, $description: String!, $className: String!, $subject: String, $dueDate: String) {
    createAssignment(title: $title, description: $description, className: $className, subject: $subject, dueDate: $dueDate) {
      id
      title
      description
      className
      subject
      assignedByName
      dueDate
      createdAt
    }
  }
`

export async function fetchAssignments(className?: string): Promise<Assignment[]> {
  const data = await gqlClient.request<{ assignments: Assignment[] }>(ASSIGNMENTS_QUERY, { className })
  return data.assignments
}

export async function createAssignment(
  title: string,
  description: string,
  className: string,
  subject?: string,
  dueDate?: string,
): Promise<Assignment> {
  const data = await gqlClient.request<{ createAssignment: Assignment }>(CREATE_ASSIGNMENT_MUTATION, {
    title,
    description,
    className,
    subject,
    dueDate,
  })
  return data.createAssignment
}
