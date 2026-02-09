'use client'

import { cn } from '@/lib/utils'

interface MutationResultOutput {
  success: boolean
  action?: string
  message?: string
  error?: string
  matchId?: string
  result?: unknown
}

interface MutationResultProps {
  part: {
    state: string
    output?: MutationResultOutput
    [key: string]: unknown
  }
  toolName: string
}

const actionLabels: Record<string, string> = {
  approveMatch: 'Match Approved',
  rejectMatch: 'Match Rejected',
  createManualMatch: 'Manual Match Created',
  bulkApproveMatches: 'Bulk Approve',
}

export function MutationResult({ part, toolName }: MutationResultProps) {
  const state = part.state as string
  const result = part.output as MutationResultOutput | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 my-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Executing {actionLabels[toolName] || toolName}...
        </div>
      </div>
    )
  }

  if (!result) return null

  const label = actionLabels[toolName] || toolName

  return (
    <div className={cn(
      'rounded-lg border p-3 my-2',
      result.success
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
          result.success
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        )}>
          {result.success ? '\u2713' : '\u2717'}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {result.message && (
        <p className="text-xs text-muted-foreground mt-1 ml-7">{result.message}</p>
      )}
      {result.error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-7">{result.error}</p>
      )}
    </div>
  )
}
