'use client'

import { cn } from '@/lib/utils'

interface MatchCandidatesResult {
  suspenseItem?: {
    sourceType: string
    description: string
    amount: number
    date: string
  }
  potentialMatches: Array<{
    id: string
    description: string
    amount: number
    date: string
    similarity: number
    reason: string
  }>
  totalFound: number
  error?: string
}

interface MatchCandidatesProps {
  part: {
    state: string
    output?: MatchCandidatesResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function MatchCandidates({ part }: MatchCandidatesProps) {
  const state = part.state as string
  const result = part.output as MatchCandidatesResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to find candidates'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 my-2 overflow-hidden">
      {result.suspenseItem && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Unmatched Item</div>
          <div className="text-xs font-medium truncate">{result.suspenseItem.description}</div>
          <div className="text-xs font-mono tabular-nums">{formatAmount(result.suspenseItem.amount)} &middot; {result.suspenseItem.date}</div>
        </div>
      )}

      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-xs font-medium">Candidates ({result.totalFound})</span>
      </div>

      {result.potentialMatches.length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground">No candidates found.</div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {result.potentialMatches.map((match, i) => (
            <div key={match.id} className="px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs truncate max-w-[180px]" title={match.description}>
                  {match.description}
                </span>
                <span className={cn(
                  'text-xs font-mono tabular-nums ml-2',
                  match.similarity >= 70 ? 'text-emerald-600' : match.similarity >= 40 ? 'text-amber-600' : 'text-zinc-500'
                )}>
                  {match.similarity}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-mono tabular-nums">{formatAmount(match.amount)}</span>
                <span>&middot;</span>
                <span>{match.date}</span>
                <span>&middot;</span>
                <span>{match.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
