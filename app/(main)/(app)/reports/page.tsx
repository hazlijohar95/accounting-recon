import dynamic from 'next/dynamic'
import ReportsLoading from './loading'

const ReportsView = dynamic(
  () => import('@/components/views/reports-view').then(mod => ({ default: mod.ReportsView })),
  { loading: () => <ReportsLoading /> }
)

export const metadata = {
  title: 'Reports | Reconcile',
}

export default function ReportsPage() {
  return <ReportsView />
}
