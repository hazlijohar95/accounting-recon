'use client'

import { cn } from '@/lib/utils'

interface MatchExplanationResult {
  matchId: string
  layer?: number
  layerName?: string
  confidence?: number
  confidenceLevel?: string
  status?: string
  matchReason?: string
  factors?: {
    amountMatch: boolean
    amountDifference: number
    dateProximity: number
    referenceMatch: boolean
  }
  cashTransaction?: {
    description: string
    amount: number
    date: string
  }
  accrualDocument?: {
    description: string
    amount: number
    date: string
    docNumber?: string
  }
  error?: string
}

interface MatchExplanationProps {
  part: {
    state: string
    output?: MatchExplanationResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const confidenceColors: Record<string, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
}

export function MatchExplanation({ part }: MatchExplanationProps) {
  const state = part.state as string
  const result = part.output as MatchExplanationResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load match explanation'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {result.layerName && (
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {result.layerName}
            </span>
          )}
          {result.status && (
            <span className={cn(
              'text-[10px] capitalize',
              result.status === 'approved' ? 'text-emerald-600' : result.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
            )}>
              {result.status}
            </span>
          )}
        </div>
        {result.confidence !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', confidenceColors[result.confidenceLevel || 'low'])}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums">{result.confidence}%</span>
          </div>
        )}
      </div>

      {result.matchReason && (
        <p className="text-xs text-muted-foreground mb-3">{result.matchReason}</p>
      )}

      {/* Transaction pair */}
      {result.cashTransaction && result.accrualDocument && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cash</div>
            <div className="text-xs truncate" title={result.cashTransaction.description}>
              {result.cashTransaction.description}
            </div>
            <div className="text-xs font-mono tabular-nums">{formatAmount(result.cashTransaction.amount)}</div>
            <div className="text-[10px] text-muted-foreground">{result.cashTransaction.date}</div>
          </div>
          <div className="p-2 rounded bg-violet-50 dark:bg-violet-950/30">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Accrual</div>
            <div className="text-xs truncate" title={result.accrualDocument.description || ''}>
              {result.accrualDocument.description}
            </div>
            <div className="text-xs font-mono tabular-nums">{formatAmount(result.accrualDocument.amount)}</div>
            <div className="text-[10px] text-muted-foreground">{result.accrualDocument.date}</div>
          </div>
        </div>
      )}

      {/* Matching factors */}
      {result.factors && (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full', result.factors.amountMatch ? 'bg-emerald-500' : 'bg-amber-500')} />
            <span>Amount: {result.factors.amountMatch ? 'Exact match' : `Diff ${formatAmount(result.factors.amountDifference)}`}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full', result.factors.dateProximity <= 3 ? 'bg-emerald-500' : result.factors.dateProximity <= 7 ? 'bg-amber-500' : 'bg-red-500')} />
            <span>Date: {result.factors.dateProximity} days apart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full', result.factors.referenceMatch ? 'bg-emerald-500' : 'bg-zinc-300')} />
            <span>Reference: {result.factors.referenceMatch ? 'Match found' : 'No match'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
