import { Suspense } from 'react'
import { ReconcileView } from '@/components/views/reconcile-view'

export const metadata = {
  title: 'Reconcile | Reconciled',
}

/**
 * Loading fallback for the reconcile page
 */
function ReconcileLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading reconciliation data...</div>
    </div>
  )
}

export default function ReconcilePage() {
  return (
    <Suspense fallback={<ReconcileLoading />}>
      <ReconcileView />
    </Suspense>
  )
}
