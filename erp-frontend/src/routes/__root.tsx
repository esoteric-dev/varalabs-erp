import React from 'react'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

const TanStackRouterDevtools =
  import.meta.env.PROD
    ? () => null
    : React.lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )

export type UserRole = 'superadmin' | 'tenant_admin' | 'user'

export interface MyRouterContext {
  queryClient: QueryClient
  orgSlug: string | null
  authStatus: 'authenticated' | 'unauthenticated'
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      {/* TODO: Insert Figma Component Here */}
      <Outlet />
      <React.Suspense>
        <TanStackRouterDevtools />
      </React.Suspense>
    </>
  )
}
