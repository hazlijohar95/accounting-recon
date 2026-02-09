import dynamic from 'next/dynamic'
import DashboardLoading from './loading'

const DashboardView = dynamic(
  () => import('@/components/views/dashboard-view').then(mod => ({ default: mod.DashboardView })),
  { loading: () => <DashboardLoading /> }
)

export const metadata = {
  title: 'Dashboard | Reconcile',
}

export default function DashboardPage() {
  return <DashboardView />
}
