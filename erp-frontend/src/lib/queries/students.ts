import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface Student {
  id: string
  name: string
  className: string
}

const STUDENTS_QUERY = gql`
  query Students {
    students {
      id
      name
      className
    }
  }
`

const STUDENT_QUERY = gql`
  query Student($id: String!) {
    student(id: $id) {
      id
      name
      className
    }
  }
`

export async function fetchStudents(): Promise<Student[]> {
  const data = await gqlClient.request<{ students: Student[] }>(STUDENTS_QUERY)
  return data.students
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const data = await gqlClient.request<{ student: Student | null }>(STUDENT_QUERY, { id })
  return data.student
}

const CREATE_STUDENT_MUTATION = gql`
  mutation CreateStudent($name: String!, $className: String!) {
    createStudent(name: $name, className: $className) {
      id
      name
      className
    }
  }
`

const MY_STUDENT_QUERY = gql`
  query MyStudent {
    myStudent {
      id
      name
      className
    }
  }
`

export async function fetchMyStudent(): Promise<Student | null> {
  const data = await gqlClient.request<{ myStudent: Student | null }>(MY_STUDENT_QUERY)
  return data.myStudent
}

export async function createStudent(name: string, className: string): Promise<Student> {
  const data = await gqlClient.request<{ createStudent: Student }>(
    CREATE_STUDENT_MUTATION,
    { name, className },
  )
  return data.createStudent
}
