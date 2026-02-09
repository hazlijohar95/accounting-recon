'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConfirmationCardProps {
  part: {
    toolCallId: string
    state: string
    input: {
      action: string
      title: string
      description: string
      details?: Record<string, unknown>
      affectedCount?: number
    }
    output?: string
  }
  addToolOutput: (params: { tool: string; toolCallId: string; output: unknown }) => void
}

export function ConfirmationCard({ part, addToolOutput }: ConfirmationCardProps) {
  const { toolCallId, state, input: args, output } = part

  const isResolved = state === 'output-available'
  const wasConfirmed = output === 'confirmed'

  const handleConfirm = () => {
    addToolOutput({ tool: 'askForConfirmation', toolCallId, output: 'confirmed' })
  }

  const handleCancel = () => {
    addToolOutput({ tool: 'askForConfirmation', toolCallId, output: 'denied' })
  }

  // Still loading input
  if (state === 'input-streaming') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 my-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          Preparing confirmation...
        </div>
      </div>
    )
  }

  if (!args) return null

  return (
    <div className={cn(
      'rounded-lg border p-4 my-2',
      isResolved
        ? wasConfirmed
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/30'
        : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
              args.action === 'bulk_approve' || args.action === 'bulk_reject'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            )}>
              {args.action.replace(/_/g, ' ')}
            </span>
            {args.affectedCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {args.affectedCount} item{args.affectedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm font-medium">{args.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{args.description}</p>
        </div>

        {isResolved && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded shrink-0',
            wasConfirmed
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40'
              : 'text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800'
          )}>
            {wasConfirmed ? 'Confirmed' : 'Cancelled'}
          </span>
        )}
      </div>

      {!isResolved && state === 'input-available' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200 dark:border-amber-800" role="group" aria-label="Confirmation actions">
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            aria-label={`Confirm: ${args.title}`}
          >
            Confirm
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
            aria-label={`Cancel: ${args.title}`}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
