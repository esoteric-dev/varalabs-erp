import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

// Import the auto-generated route tree
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

// 1. Extract the org slug from subdomain
const host = window.location.hostname
const parts = host.split('.')
// Detect subdomain:
//   "greenwood.localhost"      → orgSlug = "greenwood"
//   "greenwood.varalabs.dev"   → orgSlug = "greenwood"
//   "localhost"                → orgSlug = null
//   "varalabs.dev"             → orgSlug = null
//   "www.varalabs.dev"         → orgSlug = null
let orgSlug: string | null = null
if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
  // *.localhost (local dev)
  orgSlug = parts[0]
} else if (parts.length > 2 && parts[0] !== 'www') {
  // *.domain.tld (production)
  orgSlug = parts[0]
}

// 2. Auth check
const authStatus: 'authenticated' | 'unauthenticated' =
  localStorage.getItem('authToken') ? 'authenticated' : 'unauthenticated'

// 3. Create the Router and pass the Context
const router = createRouter({
  routeTree,
  context: {
    queryClient,
    orgSlug,
    authStatus,
  },
  defaultPreload: 'intent',
})

// Register the router instance for type safety across the app
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// 4. Render the App
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
