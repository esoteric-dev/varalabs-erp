import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { QueryClient } from '@tanstack/react-query'

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
      <TanStackRouterDevtools />
    </>
  )
}
