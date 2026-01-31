import { Skeleton, SkeletonTable } from '@/components/brand'

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border p-4 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Cash flow chart skeleton */}
      <div className="border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>

      {/* Two column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border p-4">
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="border border-border p-4">
          <Skeleton className="h-5 w-44 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  )
}
