import { gql } from 'graphql-request'
import { gqlClient } from '../graphql-client'

export interface RoleWithPermissions {
  id: string
  organisationId: string
  name: string
  slug: string
  description: string
  isSystem: boolean
  permissions: { id: string; code: string; module: string; description: string }[]
}

export interface PermissionItem {
  id: string
  code: string
  module: string
  description: string
}

const ROLES_QUERY = gql`
  query Roles($organisationId: String!) {
    roles(organisationId: $organisationId) {
      id
      organisationId
      name
      slug
      description
      isSystem
      permissions {
        id
        code
        module
        description
      }
    }
  }
`

const PERMISSIONS_QUERY = gql`
  query Permissions {
    permissions {
      id
      code
      module
      description
    }
  }
`

export async function fetchRoles(organisationId: string): Promise<RoleWithPermissions[]> {
  const data = await gqlClient.request<{ roles: RoleWithPermissions[] }>(ROLES_QUERY, {
    organisationId,
  })
  return data.roles
}

export async function fetchAllPermissions(): Promise<PermissionItem[]> {
  const data = await gqlClient.request<{ permissions: PermissionItem[] }>(PERMISSIONS_QUERY)
  return data.permissions
}

const CREATE_ROLE_MUTATION = gql`
  mutation CreateRole($organisationId: String!, $name: String!, $slug: String!, $description: String, $permissionCodes: [String!]!) {
    createRole(organisationId: $organisationId, name: $name, slug: $slug, description: $description, permissionCodes: $permissionCodes) {
      id
      organisationId
      name
      slug
      description
      isSystem
      permissions { id code module description }
    }
  }
`

const UPDATE_ROLE_MUTATION = gql`
  mutation UpdateRole($roleId: String!, $name: String, $description: String, $permissionCodes: [String!]) {
    updateRole(roleId: $roleId, name: $name, description: $description, permissionCodes: $permissionCodes) {
      id
      organisationId
      name
      slug
      description
      isSystem
      permissions { id code module description }
    }
  }
`

const DELETE_ROLE_MUTATION = gql`
  mutation DeleteRole($roleId: String!) {
    deleteRole(roleId: $roleId)
  }
`

const ASSIGN_ROLE_MUTATION = gql`
  mutation AssignRoleToUser($userId: String!, $organisationId: String!, $roleId: String!) {
    assignRoleToUser(userId: $userId, organisationId: $organisationId, roleId: $roleId)
  }
`

const REMOVE_ROLE_MUTATION = gql`
  mutation RemoveRoleFromUser($userId: String!, $organisationId: String!, $roleId: String!) {
    removeRoleFromUser(userId: $userId, organisationId: $organisationId, roleId: $roleId)
  }
`

export async function createRole(
  organisationId: string,
  name: string,
  slug: string,
  permissionCodes: string[],
  description?: string,
): Promise<RoleWithPermissions> {
  const data = await gqlClient.request<{ createRole: RoleWithPermissions }>(
    CREATE_ROLE_MUTATION,
    { organisationId, name, slug, description, permissionCodes },
  )
  return data.createRole
}

export async function updateRole(
  roleId: string,
  updates: { name?: string; description?: string; permissionCodes?: string[] },
): Promise<RoleWithPermissions> {
  const data = await gqlClient.request<{ updateRole: RoleWithPermissions }>(
    UPDATE_ROLE_MUTATION,
    { roleId, ...updates },
  )
  return data.updateRole
}

export async function deleteRole(roleId: string): Promise<boolean> {
  const data = await gqlClient.request<{ deleteRole: boolean }>(DELETE_ROLE_MUTATION, { roleId })
  return data.deleteRole
}

export async function assignRoleToUser(
  userId: string,
  organisationId: string,
  roleId: string,
): Promise<boolean> {
  const data = await gqlClient.request<{ assignRoleToUser: boolean }>(
    ASSIGN_ROLE_MUTATION,
    { userId, organisationId, roleId },
  )
  return data.assignRoleToUser
}

export async function removeRoleFromUser(
  userId: string,
  organisationId: string,
  roleId: string,
): Promise<boolean> {
  const data = await gqlClient.request<{ removeRoleFromUser: boolean }>(
    REMOVE_ROLE_MUTATION,
    { userId, organisationId, roleId },
  )
  return data.removeRoleFromUser
}
