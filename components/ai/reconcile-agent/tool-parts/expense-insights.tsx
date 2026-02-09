'use client'

import { cn } from '@/lib/utils'

interface ExpenseInsightsResult {
  summary?: {
    totalTransactions: number
    totalInflows: number
    totalOutflows: number
    netCashflow: number
    averageTransaction: number
  }
  categoryBreakdown?: Array<{
    category: string
    count: number
    total: number
    percentage: string
  }>
  anomalies?: Array<{
    description: string
    amount: number
    date: string
    reason: string
  }>
  error?: string
}

interface ExpenseInsightsProps {
  part: {
    state: string
    output?: ExpenseInsightsResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ExpenseInsights({ part }: ExpenseInsightsProps) {
  const state = part.state as string
  const result = part.output as ExpenseInsightsResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load insights'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 my-2 overflow-hidden">
      {result.summary && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatAmount(result.summary.totalInflows)}
              </div>
              <div className="text-[10px] text-muted-foreground">Inflows</div>
            </div>
            <div className="p-2 rounded bg-red-50 dark:bg-red-950/30">
              <div className="text-sm font-semibold tabular-nums text-red-700 dark:text-red-300">
                {formatAmount(result.summary.totalOutflows)}
              </div>
              <div className="text-[10px] text-muted-foreground">Outflows</div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Net Cashflow</span>
            <span className={cn(
              'font-mono tabular-nums font-medium',
              result.summary.netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {formatAmount(result.summary.netCashflow)}
            </span>
          </div>
        </div>
      )}

      {result.categoryBreakdown && result.categoryBreakdown.length > 0 && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">By Category</div>
          <div className="space-y-1">
            {result.categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[120px]">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{cat.percentage}%</span>
                  <span className="font-mono tabular-nums">{formatAmount(cat.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.anomalies && result.anomalies.length > 0 && (
        <div className="p-3">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            Anomalies ({result.anomalies.length})
          </div>
          <div className="space-y-1">
            {result.anomalies.slice(0, 5).map((anomaly, i) => (
              <div key={i} className="text-xs flex items-center justify-between">
                <span className="truncate max-w-[150px]">{anomaly.description}</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono tabular-nums ml-2">
                  {formatAmount(anomaly.amount)} ({anomaly.reason})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
