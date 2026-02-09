'use client'

import { cn } from '@/lib/utils'

interface SuspenseListResult {
  items: Array<{
    id: string
    sourceType: string
    description: string
    amount: number
    date: string
    reason: string
    suggestedAction: string
    status: string
  }>
  totalFound: number
  truncated: boolean
  error?: string
}

interface SuspenseListProps {
  part: {
    state: string
    output?: SuspenseListResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function SuspenseList({ part }: SuspenseListProps) {
  const state = part.state as string
  const result = part.output as SuspenseListResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load suspense items'}
      </div>
    )
  }

  if (result.items.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 my-2 text-xs text-emerald-600 dark:text-emerald-400">
        No suspense items found. All items are matched or resolved.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 my-2 overflow-hidden">
      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-xs font-medium">Suspense Items ({result.totalFound})</span>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {result.items.map((item) => (
          <div key={item.id} className="px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                  item.sourceType === 'cash'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                )}>
                  {item.sourceType}
                </span>
                <span className={cn(
                  'text-[10px]',
                  item.status === 'open' ? 'text-amber-600' : item.status === 'resolved' ? 'text-emerald-600' : 'text-blue-600'
                )}>
                  {item.status}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums">{formatAmount(item.amount)}</span>
            </div>
            <div className="text-xs truncate" title={item.description}>{item.description}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {item.date} &middot; {item.reason.replace(/_/g, ' ')}
            </div>
          </div>
        ))}
      </div>
      {result.truncated && (
        <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 text-[10px] text-muted-foreground">
          Showing {result.items.length} of {result.totalFound} items
        </div>
      )}
    </div>
  )
}
