'use client'

/**
 * AI Cell Status Indicators
 *
 * Visual indicators for AI operation status in spreadsheet cells:
 * - Pending: Yellow background with loading indicator
 * - Running: Blue background with spinner
 * - Complete: Green checkmark (brief flash)
 * - Error: Red background with error indicator
 *
 * @module components/unified-sheet/ai/ai-cell-status
 */

import { useMemo } from 'react'
import { cn } from '@/lib/cn'

/**
 * Cell status type matching Convex schema
 */
export type CellStatus = 'idle' | 'pending' | 'running' | 'complete' | 'error'

/**
 * Status colors for cells
 */
export const CELL_STATUS_COLORS: Record<CellStatus, {
  bg: string
  text: string
  border: string
  darkBg: string
  darkText: string
  darkBorder: string
}> = {
  idle: {
    bg: 'transparent',
    text: 'inherit',
    border: 'transparent',
    darkBg: 'transparent',
    darkText: 'inherit',
    darkBorder: 'transparent',
  },
  pending: {
    bg: '#fef9c3', // yellow-100
    text: '#854d0e', // yellow-800
    border: '#facc15', // yellow-400
    darkBg: '#422006', // yellow-950
    darkText: '#fef08a', // yellow-200
    darkBorder: '#a16207', // yellow-700
  },
  running: {
    bg: '#dbeafe', // blue-100
    text: '#1e40af', // blue-800
    border: '#3b82f6', // blue-500
    darkBg: '#172554', // blue-950
    darkText: '#93c5fd', // blue-300
    darkBorder: '#1d4ed8', // blue-700
  },
  complete: {
    bg: '#dcfce7', // green-100
    text: '#166534', // green-800
    border: '#22c55e', // green-500
    darkBg: '#052e16', // green-950
    darkText: '#86efac', // green-300
    darkBorder: '#15803d', // green-700
  },
  error: {
    bg: '#fee2e2', // red-100
    text: '#991b1b', // red-800
    border: '#ef4444', // red-500
    darkBg: '#450a0a', // red-950
    darkText: '#fca5a5', // red-300
    darkBorder: '#b91c1c', // red-700
  },
}

/**
 * Get CSS style object for a cell status
 */
export function getCellStatusStyle(
  status: CellStatus,
  isDark: boolean = false
): React.CSSProperties {
  const colors = CELL_STATUS_COLORS[status]
  return {
    backgroundColor: isDark ? colors.darkBg : colors.bg,
    color: isDark ? colors.darkText : colors.text,
    borderColor: isDark ? colors.darkBorder : colors.border,
  }
}

/**
 * Cell status badge props
 */
interface CellStatusBadgeProps {
  status: CellStatus
  className?: string
  showLabel?: boolean
}

/**
 * Small status badge indicator
 */
export function CellStatusBadge({
  status,
  className,
  showLabel = false,
}: CellStatusBadgeProps) {
  if (status === 'idle') return null

  const config = {
    pending: {
      icon: '⏳',
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    },
    running: {
      icon: '⚙️',
      label: 'Running',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    },
    complete: {
      icon: '✓',
      label: 'Complete',
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    },
    error: {
      icon: '✕',
      label: 'Error',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    },
  }[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded',
        config.className,
        className
      )}
    >
      <span className={status === 'running' ? 'animate-spin' : ''}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

/**
 * Cell overlay indicator props
 */
interface CellOverlayIndicatorProps {
  status: CellStatus
  error?: string
  onRetry?: () => void
  className?: string
}

/**
 * Overlay indicator shown on top of cells with AI status
 */
export function CellOverlayIndicator({
  status,
  error,
  onRetry,
  className,
}: CellOverlayIndicatorProps) {
  if (status === 'idle' || status === 'complete') return null

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center pointer-events-none',
        className
      )}
    >
      {status === 'pending' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100/90 dark:bg-yellow-950/90 rounded text-xs">
          <span className="animate-pulse">⏳</span>
          <span className="text-yellow-800 dark:text-yellow-200">Queued</span>
        </div>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100/90 dark:bg-blue-950/90 rounded text-xs">
          <span className="animate-spin">⚙️</span>
          <span className="text-blue-800 dark:text-blue-200">Processing</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-100/90 dark:bg-red-950/90 rounded text-xs pointer-events-auto">
          <span>❌</span>
          <span className="text-red-800 dark:text-red-200" title={error}>
            Error
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Job stats summary props
 */
interface JobStatsSummaryProps {
  stats: {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
  }
  onRetryFailed?: () => void
  onCancelPending?: () => void
  className?: string
}

/**
 * Summary display of AI job statistics
 */
export function JobStatsSummary({
  stats,
  onRetryFailed,
  onCancelPending,
  className,
}: JobStatsSummaryProps) {
  const hasActiveJobs = stats.pending > 0 || stats.running > 0
  const hasFailedJobs = stats.failed > 0

  if (stats.total === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg text-sm',
        className
      )}
    >
      <span className="text-muted-foreground">AI Jobs:</span>

      {stats.running > 0 && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <span className="animate-spin">⚙️</span>
          <span>{stats.running} running</span>
        </span>
      )}

      {stats.pending > 0 && (
        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <span>⏳</span>
          <span>{stats.pending} pending</span>
          {onCancelPending && (
            <button
              onClick={onCancelPending}
              className="ml-1 text-xs underline hover:no-underline"
            >
              Cancel
            </button>
          )}
        </span>
      )}

      {stats.completed > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <span>✓</span>
          <span>{stats.completed} complete</span>
        </span>
      )}

      {stats.failed > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <span>✕</span>
          <span>{stats.failed} failed</span>
          {onRetryFailed && (
            <button
              onClick={onRetryFailed}
              className="ml-1 text-xs underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </span>
      )}
    </div>
  )
}

/**
 * Hook to get status class names for Univer cells
 */
export function useCellStatusClasses(status: CellStatus): string {
  return useMemo(() => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950'
      case 'running':
        return 'bg-blue-100 dark:bg-blue-950'
      case 'complete':
        return 'bg-green-100 dark:bg-green-950'
      case 'error':
        return 'bg-red-100 dark:bg-red-950'
      default:
        return ''
    }
  }, [status])
}
