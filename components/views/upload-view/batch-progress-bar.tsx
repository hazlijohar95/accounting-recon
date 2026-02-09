'use client'

import { useMemo } from 'react'
import type { UploadedFile } from './types'

/**
 * Batch Progress Bar - shows aggregate upload progress
 */
export function BatchProgressBar({ files }: { files: UploadedFile[] }) {
  const stats = useMemo(() => {
    const total = files.length
    const completed = files.filter((f) => f.status === 'complete').length
    const processing = files.filter(
      (f) => f.status === 'processing' || f.status === 'uploading'
    ).length
    const progress =
      total > 0 ? Math.round(((completed + processing * 0.5) / total) * 100) : 0
    return { total, completed, processing, progress }
  }, [files])

  if (stats.total === 0) return null

  return (
    <div className="p-3 border border-border bg-secondary/20">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">Overall Progress</span>
        <span className="tabular-nums font-medium">
          {stats.completed}/{stats.total} complete
        </span>
      </div>
      <div className="h-1.5 bg-secondary overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${stats.progress}%` }}
          role="progressbar"
          aria-valuenow={stats.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall batch progress: ${stats.progress}%`}
        />
      </div>
    </div>
  )
}
