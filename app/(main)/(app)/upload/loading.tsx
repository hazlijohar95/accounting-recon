import { Skeleton } from '@/components/brand'

export default function UploadLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <header>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </header>

      {/* Upload zone skeleton */}
      <div className="border-2 border-dashed border-border p-8 md:p-12">
        <div className="flex flex-col items-center">
          <Skeleton className="h-10 w-10 mb-4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36 mt-2" />
          <Skeleton className="h-9 w-28 mt-4" />
        </div>
      </div>

      {/* File list skeleton */}
      <div className="border border-border">
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
