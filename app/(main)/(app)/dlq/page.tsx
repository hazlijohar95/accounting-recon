import { DLQView } from '@/components/views/dlq-view'

export const metadata = {
  title: 'Failed Extractions | Reconcile',
  description: 'Manage and retry failed document extractions',
}

export default function DLQPage() {
  return <DLQView />
}
