'use client'

import { cn } from '@/lib/utils'

interface TransactionTableResult {
  transactions: Array<{
    id: string
    type: string
    description: string
    amount: number
    date: string
    status: string
    reference?: string
    category?: string
    counterparty?: string
    docNumber?: string
  }>
  totalFound: number
  truncated: boolean
  error?: string
}

interface TransactionTableProps {
  part: {
    state: string
    output?: TransactionTableResult
    [key: string]: unknown
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const statusColors: Record<string, string> = {
  pending: 'text-amber-600 dark:text-amber-400',
  matched: 'text-emerald-600 dark:text-emerald-400',
  suspense: 'text-red-600 dark:text-red-400',
  partial: 'text-blue-600 dark:text-blue-400',
}

export function TransactionTable({ part }: TransactionTableProps) {
  const state = part.state as string
  const result = part.output as TransactionTableResult | undefined

  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 my-2 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
        {result?.error || 'Failed to load transactions'}
      </div>
    )
  }

  if (result.transactions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 my-2 text-xs text-muted-foreground">
        No transactions found matching the criteria.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 my-2 overflow-hidden">
      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-xs font-medium">
          Transactions ({result.totalFound}{result.truncated ? '+' : ''})
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.transactions.map((txn) => (
              <tr key={txn.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <td className="p-2">
                  <span className={cn(
                    'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                    txn.type === 'cash'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  )}>
                    {txn.type}
                  </span>
                </td>
                <td className="p-2 max-w-[200px] truncate" title={txn.description}>
                  {txn.description}
                </td>
                <td className={cn(
                  'p-2 text-right font-mono tabular-nums whitespace-nowrap',
                  txn.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {formatAmount(txn.amount)}
                </td>
                <td className="p-2 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                  {txn.date}
                </td>
                <td className="p-2">
                  <span className={cn('capitalize', statusColors[txn.status])}>
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.truncated && (
        <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 text-[10px] text-muted-foreground">
          Showing {result.transactions.length} of {result.totalFound} results
        </div>
      )}
    </div>
  )
}
