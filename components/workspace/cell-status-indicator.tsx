'use client'

/**
 * Cell Status Indicator
 *
 * Displays the AI enrichment status for a cell with:
 * - Pending: Pulsing dot
 * - Running: Spinning loader
 * - Complete: Checkmark
 * - Error: Warning icon with tooltip and copy functionality
 *
 * Brand-consistent with Reconciled's minimal, geometric aesthetic.
 *
 * @module components/workspace/cell-status-indicator
 */

import { useState } from 'react'
import {
  IconLoader,
  IconCheck,
  IconWarningCircle,
} from '@/components/brand/icons'

interface CellStatusIndicatorProps {
  status?: string
  error?: string
}

/**
 * Format error message for display (truncate very long errors)
 */
function formatError(err?: string): string {
  if (!err) return 'An error occurred'
  if (err.length > 500) return err.slice(0, 500) + '...'
  return err
}

/**
 * Cell status indicator with brand-consistent styling
 */
export function CellStatusIndicator({ status, error }: CellStatusIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!status || status === 'idle') return null

  // Copy full error to clipboard
  const handleCopyError = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!error) return
    try {
      await navigator.clipboard.writeText(error)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = error
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {status === 'pending' && (
        <span title="Pending - waiting to process">
          <div className="w-2 h-2 bg-muted-foreground/40 animate-pulse" />
        </span>
      )}
      {status === 'running' && (
        <span title="Running - AI enrichment in progress">
          <IconLoader size={12} className="text-chart-5 animate-spin" />
        </span>
      )}
      {status === 'complete' && (
        <span title="Complete - enrichment successful">
          <IconCheck size={12} className="text-success" />
        </span>
      )}
      {status === 'error' && (
        <span
          className="cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={(e) => {
            e.stopPropagation()
            setShowTooltip(!showTooltip)
          }}
        >
          <IconWarningCircle size={12} className="text-destructive" />
          {showTooltip && (
            <div className="absolute z-50 left-0 top-full mt-1 max-w-md p-3 text-xs bg-background border border-destructive/30 shadow-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-medium text-destructive">Enrichment Error</span>
                <button
                  onClick={handleCopyError}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title={copied ? "Copied!" : "Copy error"}
                >
                  {copied ? (
                    <IconCheck size={12} className="text-success" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4h8v8H4z" fillOpacity="0.3" />
                      <path d="M2 2h8v8H2z" fill="currentColor" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {formatError(error)}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t border-border">
                Right-click the cell to retry
              </p>
            </div>
          )}
        </span>
      )}
    </div>
  )
}
