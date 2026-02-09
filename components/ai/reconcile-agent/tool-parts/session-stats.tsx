'use client'

import { cn } from '@/lib/utils'

interface SessionStatsResult {
  sessionName?: string
  progress?: number
  counts?: {
    totalCashTransactions: number
    totalAccrualDocuments: number
    pendingCash: number
    matchedCash: number
    pendingAccrual: number
    matchedAccrual: number
  }
  totals?: {
    cashAmount: number
    accrualAmount: number
    variance: number
  }
  error?: string
}

interface SessionStatsProps {
  part: {
    state: string
    output?: SessionStatsResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function SessionStats({ part }: SessionStatsProps) {
  const state = part.state as string
  const result = part.output as SessionStatsResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load stats'}
      </div>
    )
  }

  const { counts, totals } = result

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2">
      {result.sessionName && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">{result.sessionName}</span>
          {result.progress !== undefined && (
            <span className="text-xs font-mono tabular-nums">{result.progress}%</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {counts && (
          <>
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
              <div className="text-lg font-semibold tabular-nums">{counts.matchedCash}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Matched</div>
            </div>
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
              <div className="text-lg font-semibold tabular-nums">{counts.pendingCash}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</div>
            </div>
            <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800">
              <div className="text-lg font-semibold tabular-nums">{counts.totalCashTransactions}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cash</div>
            </div>
          </>
        )}
      </div>

      {totals && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cash Total</span>
            <span className="font-mono tabular-nums">{formatAmount(totals.cashAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Accrual Total</span>
            <span className="font-mono tabular-nums">{formatAmount(totals.accrualAmount)}</span>
          </div>
          <div className="flex justify-between text-xs font-medium pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Variance</span>
            <span className={cn(
              'font-mono tabular-nums',
              Math.abs(totals.variance) < 0.01
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            )}>
              {formatAmount(totals.variance)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
