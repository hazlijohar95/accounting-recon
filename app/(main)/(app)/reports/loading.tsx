import { Skeleton, SkeletonTable } from '@/components/brand'

export default function ReportsLoading() {
  return (
    <div className="flex h-full animate-in fade-in duration-300">
      {/* Report selection sidebar */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
        <div className="flex-1 p-2 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report preview */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20 mt-2" />
              </div>
            ))}
          </div>

          {/* Table */}
          <SkeletonTable rows={5} columns={4} />
        </div>
      </div>
    </div>
  )
}
