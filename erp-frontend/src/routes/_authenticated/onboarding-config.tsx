import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/onboarding-config')({
  beforeLoad: () => {
    throw redirect({ to: '/settings' })
  },
  component: () => null,
})
