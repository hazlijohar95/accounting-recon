import dynamic from 'next/dynamic'
import SettingsLoading from './loading'

const SettingsView = dynamic(
  () => import('@/components/views/settings-view').then(mod => ({ default: mod.SettingsView })),
  { loading: () => <SettingsLoading /> }
)

export const metadata = {
  title: 'Settings | Reconcile',
}

export default function SettingsPage() {
  return <SettingsView />
}
