'use client'

/**
 * Grid Empty State Components
 *
 * Empty state displays for the worksheet grid:
 * - CompletelyEmptyState: No columns or rows
 * - NoRowsState: Has columns but no rows
 *
 * @module components/workspace/grid-empty-state
 */

import { IconPlus } from '@/components/brand/icons'

interface CompletelyEmptyStateProps {
  onAddColumn: () => void
}

/**
 * Empty state when worksheet has no columns or rows
 */
export function CompletelyEmptyState({ onAddColumn }: CompletelyEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="text-muted-foreground/30"
        >
          <rect x="8" y="8" width="14" height="10" fill="currentColor" />
          <rect x="26" y="8" width="14" height="10" fill="currentColor" fillOpacity="0.6" />
          <rect x="8" y="22" width="14" height="10" fill="currentColor" fillOpacity="0.4" />
          <rect x="26" y="22" width="14" height="10" fill="currentColor" fillOpacity="0.2" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        Empty worksheet
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Add columns and rows, or paste data from a spreadsheet
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAddColumn}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <IconPlus size={12} />
          Add Column
        </button>
      </div>
    </div>
  )
}

interface NoRowsStateProps {
  onAddRow: () => void
}

/**
 * Empty state when worksheet has columns but no rows
 */
export function NoRowsState({ onAddRow }: NoRowsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground mb-4">
        No rows yet. Add data or paste from spreadsheet.
      </p>
      <button
        onClick={onAddRow}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
      >
        <IconPlus size={12} />
        Add Row
      </button>
    </div>
  )
}
