import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface OrgUser {
  id: string
  name: string
  email: string
  systemRole: string
  phone: string | null
  roleNames: string | null
}

export interface CreateUserResult {
  user: {
    id: string
    name: string
    email: string
    systemRole: string
    phone: string | null
  }
  generatedPassword: string | null
}

const ORG_USERS_QUERY = gql`
  query OrgUsers {
    orgUsers {
      id
      name
      email
      systemRole
      phone
      roleNames
    }
  }
`

export async function fetchOrgUsers(): Promise<OrgUser[]> {
  const data = await gqlClient.request<{ orgUsers: OrgUser[] }>(ORG_USERS_QUERY)
  return data.orgUsers
}

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($name: String!, $email: String!, $phone: String, $systemRole: String, $password: String) {
    createUser(name: $name, email: $email, phone: $phone, systemRole: $systemRole, password: $password) {
      user {
        id
        name
        email
        systemRole
        phone
      }
      generatedPassword
    }
  }
`

export async function createUser(
  name: string,
  email: string,
  phone?: string,
  systemRole?: string,
  password?: string,
): Promise<CreateUserResult> {
  const data = await gqlClient.request<{
    createUser: CreateUserResult
  }>(CREATE_USER_MUTATION, { name, email, phone, systemRole, password })
  return data.createUser
}
