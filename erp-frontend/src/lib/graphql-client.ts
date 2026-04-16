import { GraphQLClient } from 'graphql-request'
import { REFRESH_TOKEN_MUTATION, type RefreshTokenResponse } from './queries/user'

const rawEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? '/graphql'
const endpoint = rawEndpoint.startsWith('http')
  ? rawEndpoint
  : `${window.location.origin}${rawEndpoint}`

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: Response | Promise<Response>) => void
  reject: (reason?: any) => void
  req: Request
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      // Replay the request with the new token
      const newHeaders = new Headers(prom.req.headers)
      if (token) {
        newHeaders.set('Authorization', `Bearer ${token}`)
      }
      const newReq = new Request(prom.req, { headers: newHeaders })
      prom.resolve(fetch(newReq))
    }
  })
  failedQueue = []
}

const clearAndRedirect = () => {
  // Read orgSlug from path before clearing storage
  const KNOWN = ['login', 'welcome', 'signup']
  const seg = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
  const orgSlug = seg && !KNOWN.includes(seg) ? seg : null
  localStorage.removeItem('authToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('orgSlug')
  const loginPath = orgSlug ? `/${orgSlug}/login` : '/login'
  if (!window.location.pathname.endsWith('/login')) {
    window.location.href = loginPath
  }
}

async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let req = new Request(input, init)

  // Attach current auth token
  const token = localStorage.getItem('authToken')
  if (token && !req.headers.has('Authorization')) {
    req.headers.set('Authorization', `Bearer ${token}`)
  }

  // Clone request before sending since its body can only be read once
  const initialRequest = req.clone()

  let response = await fetch(req)

  const isUnauthorized = response.status === 401
  
  let isGraphqlUnauthenticated = false
  if (response.status === 200) {
    const clone = response.clone()
    try {
      const body = await clone.json()
      if (body?.errors?.some((e: any) => e?.extensions?.code === 'UNAUTHENTICATED')) {
        isGraphqlUnauthenticated = true
      }
    } catch (e) {
      // Ignore JSON parse error for body
    }
  }

  const needsRefresh = isUnauthorized || isGraphqlUnauthenticated
  const refreshToken = localStorage.getItem('refreshToken')

  // Fast path: query succeeded normally and not unauthenticated
  if (!needsRefresh) {
    return response
  }

  // Need to re-authenticate but don't have a refresh token
  if (!refreshToken) {
    clearAndRedirect()
    // Return a never-resolving promise so the app doesn't flash an error boundary 
    // while the browser navigates to the login page.
    return new Promise(() => {}) 
  }

  // If we reach here, we need to refresh the token and we have a refreshToken
  if (isRefreshing) {
    // Another request is already refreshing the token, so queue this one
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject, req: initialRequest })
    })
  }

  isRefreshing = true

  try {
    // Prefer URL-derived org slug (most current) over localStorage
    const KNOWN_ROUTES = ['login', 'welcome', 'signup', 'about', 'terms', 'privacy']
    const seg = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
    const orgSlug = (seg && !KNOWN_ROUTES.includes(seg) ? seg : null)
      ?? localStorage.getItem('orgSlug')

    // Perform the refresh token mutation directly via standard fetch to avoid loop
    const refreshQuery = {
      query: REFRESH_TOKEN_MUTATION.toString(),
      variables: { refreshToken, orgSlug: orgSlug ?? null }
    }

    const refreshResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refreshQuery),
    })

    if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token API call')
    }

    const refreshData = await refreshResponse.json()
    if (refreshData?.errors) {
      throw new Error('Refresh token invalid or expired')
    }

    const tokens: RefreshTokenResponse = refreshData?.data?.refreshToken

    localStorage.setItem('authToken', tokens.token)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    // Replay the queued requests
    processQueue(null, tokens.token)

    // Replay the original request
    const newHeaders = new Headers(initialRequest.headers)
    newHeaders.set('Authorization', `Bearer ${tokens.token}`)
    const newReq = new Request(initialRequest, { headers: newHeaders })
    return fetch(newReq)
  } catch (error: any) {
    // Complete failure, log user out
    processQueue(error)
    clearAndRedirect()
    return new Promise(() => {}) 
  } finally {
    isRefreshing = false
  }
}

export const gqlClient = new GraphQLClient(endpoint, {
  fetch: customFetch
})
