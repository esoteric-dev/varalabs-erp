import { createFileRoute } from '@tanstack/react-router'
import AdminSettings from '../../components/settings/AdminSettings'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsComponent,
})

function SettingsComponent() {
  return <AdminSettings />
}
