import { createFileRoute } from '@tanstack/react-router'
import AddStaffPage from '../../components/staff/onboarding/StaffOnboarding'

export const Route = createFileRoute('/_authenticated/add-staff')({
  component: AddStaffPage,
})
