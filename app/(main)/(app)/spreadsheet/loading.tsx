import { Skeleton } from '@/components/brand'

export default function SpreadsheetLoading() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="p-6 border-b border-border">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Toolbar skeleton */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Grid skeleton */}
      <div className="flex-1 p-4">
        {/* Column headers */}
        <div className="flex gap-px mb-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 12 }).map((_, row) => (
          <div key={row} className="flex gap-px mb-px">
            {Array.from({ length: 6 }).map((_, col) => (
              <Skeleton key={col} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
