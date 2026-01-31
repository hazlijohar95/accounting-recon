import { Skeleton } from '@/components/brand'

export default function WorkspaceLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Grid skeleton */}
      <div className="border border-border">
        {/* Header row */}
        <div className="flex border-b border-border bg-muted/50">
          <Skeleton className="h-8 w-8 m-2" />
          <Skeleton className="h-8 w-32 m-2" />
          <Skeleton className="h-8 w-32 m-2" />
          <Skeleton className="h-8 w-32 m-2" />
          <Skeleton className="h-8 w-32 m-2" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex border-b border-border last:border-b-0">
            <Skeleton className="h-8 w-8 m-2" />
            <Skeleton className="h-8 w-32 m-2" />
            <Skeleton className="h-8 w-32 m-2" />
            <Skeleton className="h-8 w-32 m-2" />
            <Skeleton className="h-8 w-32 m-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
