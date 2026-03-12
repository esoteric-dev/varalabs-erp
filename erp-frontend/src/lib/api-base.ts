// Derive the REST API base URL from the same source as the GraphQL endpoint
// so that REST calls (offer letters, photo uploads, etc.) reach the backend
// in production where only VITE_GRAPHQL_ENDPOINT is set.
function resolveApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  const gqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? ''
  if (gqlEndpoint.startsWith('http')) {
    try { return new URL(gqlEndpoint).origin } catch { /* fall through */ }
  }
  return ''
}

export const API_BASE = resolveApiBase()
