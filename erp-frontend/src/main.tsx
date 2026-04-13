import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

// Import the auto-generated route tree
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

// 1. Extract org slug from URL path: varalabs.dev/greenwood/ → 'greenwood'
//    Top-level route names are never org slugs.
const KNOWN_ROUTES = new Set(['login', 'welcome', 'signup', 'about', 'terms', 'privacy'])
const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
const orgSlug: string | null =
  firstSegment && !KNOWN_ROUTES.has(firstSegment) ? firstSegment : null

// 2. Auth check
const authStatus: 'authenticated' | 'unauthenticated' =
  localStorage.getItem('authToken') ? 'authenticated' : 'unauthenticated'

// 3. Create the Router and pass the Context
//    basepath strips the org prefix so all route files stay as-is (/students, /login, etc.)
const router = createRouter({
  routeTree,
  basepath: orgSlug ? `/${orgSlug}` : '/',
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
