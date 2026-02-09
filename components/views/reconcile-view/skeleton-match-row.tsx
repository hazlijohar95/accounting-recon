'use client'

import { Skeleton } from '@/components/brand'

/**
 * Loading skeleton placeholder for match rows during data fetching.
 */
export function SkeletonMatchRow() {
  return (
    <div className="skeleton-match-row">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-5" />
        <Skeleton className="flex-1 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
      <div className="flex items-center justify-between pl-14 mt-1">
        <Skeleton className="w-20 h-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-1" />
          <Skeleton className="w-10 h-3" />
        </div>
      </div>
    </div>
  )
}
