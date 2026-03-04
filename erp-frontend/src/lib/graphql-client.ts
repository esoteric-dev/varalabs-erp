import { GraphQLClient } from 'graphql-request'

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? `${window.location.origin}/graphql`

export const gqlClient = new GraphQLClient(endpoint, {
  headers: () => {
    const token = localStorage.getItem('authToken')
    const headers = new Headers()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})
