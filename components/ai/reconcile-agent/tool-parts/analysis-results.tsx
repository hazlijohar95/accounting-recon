'use client'

import { cn } from '@/lib/utils'

interface AnalysisResultsOutput {
  success: boolean
  analyzed?: number
  pendingCashCount?: number
  pendingAccrualCount?: number
  potentialMatches?: Array<{
    cashId: string
    cashDescription: string
    cashAmount: number
    accrualId: string
    accrualDescription: string
    accrualAmount: number
    score: number
    confidence: string
    factors: string[]
  }>
  highConfidenceCount?: number
  message?: string
  error?: string
}

interface AnalysisResultsProps {
  part: {
    state: string
    output?: AnalysisResultsOutput
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function AnalysisResults({ part }: AnalysisResultsProps) {
  const state = part.state as string
  const result = part.output as AnalysisResultsOutput | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Running matching analysis...
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Analysis failed'}
      </div>
    )
  }

  if (!result.potentialMatches || result.potentialMatches.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 my-2 text-xs text-muted-foreground">
        {result.message || 'No potential matches found.'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 my-2 overflow-hidden">
      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-xs font-medium">Analysis Results</span>
        {result.highConfidenceCount !== undefined && result.highConfidenceCount > 0 && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {result.highConfidenceCount} high confidence
          </span>
        )}
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {result.potentialMatches.map((match, i) => (
          <div key={`${match.cashId}-${match.accrualId}`} className="px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                match.confidence === 'high'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : match.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              )}>
                {match.score}% {match.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="truncate" title={match.cashDescription}>
                <span className="text-muted-foreground">Cash: </span>
                {match.cashDescription} ({formatAmount(match.cashAmount)})
              </div>
              <div className="truncate" title={match.accrualDescription || ''}>
                <span className="text-muted-foreground">Accrual: </span>
                {match.accrualDescription} ({formatAmount(match.accrualAmount)})
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {match.factors.join(' \u00b7 ')}
            </div>
          </div>
        ))}
      </div>
      {result.message && (
        <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 text-[10px] text-muted-foreground">
          {result.message}
        </div>
      )}
    </div>
  )
}
