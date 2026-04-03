import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    // If authenticated, go to dashboard
    if (context.authStatus === 'authenticated') {
      throw redirect({ to: '/_authenticated/' })
    }
    // If on a subdomain (has orgSlug), redirect to login
    if (context.orgSlug) {
      throw redirect({ to: '/login' })
    }
    // Otherwise show welcome page (root domain, unauthenticated)
  },
  component: IndexRedirect,
})

function IndexRedirect() {
  // This component won't render because of the redirect above
  return null
}
