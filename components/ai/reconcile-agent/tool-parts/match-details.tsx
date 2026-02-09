'use client'

import { cn } from '@/lib/utils'

interface MatchDetailsResult {
  matches: Array<{
    matchId: string
    layer?: number
    layerName?: string
    confidence?: number
    confidenceLevel?: string
    status?: string
    matchReason?: string
    isPartialMatch?: boolean
    matchedAmount?: number
    cashTransaction?: {
      id: string
      description: string
      amount: number
      date: string
    } | null
    accrualDocument?: {
      id: string
      description: string
      amount: number
      date: string
      docNumber?: string
    } | null
    error?: string
  }>
  error?: string
}

interface MatchDetailsProps {
  part: {
    state: string
    output?: MatchDetailsResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function MatchDetails({ part }: MatchDetailsProps) {
  const state = part.state as string
  const result = part.output as MatchDetailsResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load match details'}
      </div>
    )
  }

  return (
    <div className="space-y-2 my-2">
      {result.matches.map((match) => (
        <div key={match.matchId} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
          {match.error ? (
            <div className="text-xs text-red-600 dark:text-red-400">{match.error}</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {match.layerName && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {match.layerName}
                    </span>
                  )}
                  {match.isPartialMatch && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      Partial
                    </span>
                  )}
                  <span className={cn(
                    'text-[10px] capitalize',
                    match.status === 'approved' ? 'text-emerald-600' : match.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                  )}>
                    {match.status}
                  </span>
                </div>
                {match.confidence !== undefined && (
                  <span className="text-xs font-mono tabular-nums">{match.confidence}%</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {match.cashTransaction && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Cash</div>
                    <div className="truncate">{match.cashTransaction.description}</div>
                    <div className="font-mono tabular-nums">{formatAmount(match.cashTransaction.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{match.cashTransaction.date}</div>
                  </div>
                )}
                {match.accrualDocument && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Accrual</div>
                    <div className="truncate">{match.accrualDocument.description}</div>
                    <div className="font-mono tabular-nums">{formatAmount(match.accrualDocument.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{match.accrualDocument.date}</div>
                  </div>
                )}
              </div>

              {match.matchReason && (
                <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {match.matchReason}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
