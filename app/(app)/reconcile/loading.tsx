import { Skeleton } from '@/components/brand'

export default function ReconcileLoading() {
  return (
    <div className="flex h-full animate-in fade-in duration-300">
      {/* Main list */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {['Pending', 'Matched', 'Suspense'].map((tab) => (
            <div key={tab} className="px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* List items */}
        <div className="flex-1 overflow-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-20 h-4" />
              </div>
              <div className="flex items-center justify-between pl-14 mt-2">
                <Skeleton className="w-20 h-3" />
                <div className="flex items-center gap-2">
                  <Skeleton className="w-24 h-1" />
                  <Skeleton className="w-10 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-96 flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Skeleton className="w-16 h-16 mb-4" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
    </div>
  )
}
