'use client'

import { cn } from '@/lib/cn'

interface UniverSheetLoadingProps {
  height?: string | number
  className?: string
  columns?: number
  rows?: number
}

/**
 * Loading skeleton for UniverSheet
 *
 * Displays a spreadsheet-like skeleton while the Univer library initializes.
 * Uses CSS animations for a subtle loading effect.
 */
export function UniverSheetLoading({
  height = '600px',
  className,
  columns = 6,
  rows = 10,
}: UniverSheetLoadingProps) {
  return (
    <div
      className={cn(
        'relative border border-border rounded-lg overflow-hidden bg-background',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Header row skeleton */}
      <div className="flex h-8 border-b border-border bg-muted/50">
        {/* Row number column */}
        <div className="w-10 h-full border-r border-border bg-muted/30" />
        {/* Column headers */}
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-full border-r border-border animate-pulse"
            style={{ width: getColumnWidth(i) }}
          >
            <div className="h-4 mx-2 my-2 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Data rows skeleton */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={`row-${row}`}
          className={cn(
            'flex h-7 border-b border-border/50',
            row % 2 === 1 && 'bg-muted/10'
          )}
        >
          {/* Row number */}
          <div className="w-10 h-full border-r border-border/50 flex items-center justify-center">
            <div className="w-4 h-3 bg-muted/50 rounded animate-pulse" />
          </div>
          {/* Cell skeletons */}
          {Array.from({ length: columns }).map((_, col) => (
            <div
              key={`cell-${row}-${col}`}
              className="h-full border-r border-border/30"
              style={{ width: getColumnWidth(col) }}
            >
              <div
                className="h-3 mx-2 my-2 bg-muted/40 rounded animate-pulse"
                style={{
                  width: `${Math.random() * 40 + 40}%`,
                  animationDelay: `${(row * columns + col) * 50}ms`,
                }}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Loading overlay with message */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm animate-pulse">Initializing spreadsheet...</span>
          </div>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Get estimated column width based on column index
 * Mimics the actual spreadsheet column widths
 */
function getColumnWidth(index: number): number {
  const widths = [100, 250, 120, 120, 100, 100, 100]
  return widths[index] || 100
}
