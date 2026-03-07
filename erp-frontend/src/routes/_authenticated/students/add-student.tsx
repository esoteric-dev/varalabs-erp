import { createFileRoute } from '@tanstack/react-router'
import StudentOnboarding from '../../../components/students/onboarding/StudentOnboarding'
import { StudentOnboardingProvider } from '../../../components/students/onboarding/StudentOnboardingContext'

export const Route = createFileRoute('/_authenticated/students/add-student')({
  component: AddStudentComponent,
})

function AddStudentComponent() {
  return (
    <StudentOnboardingProvider>
      <StudentOnboarding />
    </StudentOnboardingProvider>
  )
}
