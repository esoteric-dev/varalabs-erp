import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string
  title: string
  description?: string
  eventDate: string
  endDate?: string
  startTime?: string
  endTime?: string
}

export interface Subject {
  id: string
  name: string
  className?: string
  status: string
}

export interface StudentActivity {
  id: string
  studentId?: string
  title: string
  description?: string
  activityDate: string
}

export interface AdminTodo {
  id: string
  title: string
  dueTime?: string
  status: string
}

export interface Notice {
  id: string
  title: string
  content: string
  published: boolean
  createdAt: string
}

export interface LeaveRequest {
  id: string
  userId: string
  userName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  createdAt: string
}

// ── Queries ──────────────────────────────────────────────────────────────────

const EVENTS_QUERY = gql`
  query Events { events { id title description eventDate endDate startTime endTime } }
`

const SUBJECTS_QUERY = gql`
  query Subjects { subjects { id name className status } }
`

const ACTIVITIES_QUERY = gql`
  query StudentActivities { studentActivities { id studentId title description activityDate } }
`

const TODOS_QUERY = gql`
  query AdminTodos { adminTodos { id title dueTime status } }
`

const NOTICES_QUERY = gql`
  query Notices { notices { id title content published createdAt } }
`

const LEAVE_REQUESTS_QUERY = gql`
  query LeaveRequests { leaveRequests { id userId userName leaveType startDate endDate reason status createdAt } }
`

const CLASSES_QUERY = gql`
  query GetClasses { getClasses }
`

// ── Mutations ────────────────────────────────────────────────────────────────

const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) { createEvent(input: $input) { id title } }
`

const CREATE_TODO = gql`
  mutation CreateAdminTodo($input: CreateAdminTodoInput!) { createAdminTodo(input: $input) { id title dueTime status } }
`

const UPDATE_TODO = gql`
  mutation UpdateAdminTodo($input: UpdateAdminTodoInput!) { updateAdminTodo(input: $input) { id title dueTime status } }
`

const DELETE_TODO = gql`
  mutation DeleteAdminTodo($id: String!) { deleteAdminTodo(id: $id) }
`

const ADD_CLASS = gql`
  mutation AddClass($className: String!) { addClass(className: $className) }
`

// ── Fetch Functions ──────────────────────────────────────────────────────────

export const fetchEvents = async (): Promise<Event[]> => {
  const d = await gqlClient.request<{ events: Event[] }>(EVENTS_QUERY)
  return d.events
}

export const fetchSubjects = async (): Promise<Subject[]> => {
  const d = await gqlClient.request<{ subjects: Subject[] }>(SUBJECTS_QUERY)
  return d.subjects
}

export const fetchActivities = async (): Promise<StudentActivity[]> => {
  const d = await gqlClient.request<{ studentActivities: StudentActivity[] }>(ACTIVITIES_QUERY)
  return d.studentActivities
}

export const fetchTodos = async (): Promise<AdminTodo[]> => {
  const d = await gqlClient.request<{ adminTodos: AdminTodo[] }>(TODOS_QUERY)
  return d.adminTodos
}

export const fetchNotices = async (): Promise<Notice[]> => {
  const d = await gqlClient.request<{ notices: Notice[] }>(NOTICES_QUERY)
  return d.notices
}

export const fetchLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const d = await gqlClient.request<{ leaveRequests: LeaveRequest[] }>(LEAVE_REQUESTS_QUERY)
  return d.leaveRequests
}

export const fetchClasses = async (): Promise<string[]> => {
  const d = await gqlClient.request<{ getClasses: string[] }>(CLASSES_QUERY)
  return d.getClasses
}

export const createEvent = async (input: Omit<Event, 'id'>): Promise<Event> => {
  const d = await gqlClient.request<{ createEvent: Event }>(CREATE_EVENT, { input })
  return d.createEvent
}

export const createTodo = async (title: string, dueTime?: string): Promise<AdminTodo> => {
  const d = await gqlClient.request<{ createAdminTodo: AdminTodo }>(CREATE_TODO, { input: { title, dueTime } })
  return d.createAdminTodo
}

export const updateTodo = async (id: string, status: string): Promise<AdminTodo> => {
  const d = await gqlClient.request<{ updateAdminTodo: AdminTodo }>(UPDATE_TODO, { input: { id, status } })
  return d.updateAdminTodo
}

export const deleteTodo = async (id: string): Promise<boolean> => {
  const d = await gqlClient.request<{ deleteAdminTodo: boolean }>(DELETE_TODO, { id })
  return d.deleteAdminTodo
}

export const addClass = async (className: string): Promise<boolean> => {
  const d = await gqlClient.request<{ addClass: boolean }>(ADD_CLASS, { className })
  return d.addClass
}
