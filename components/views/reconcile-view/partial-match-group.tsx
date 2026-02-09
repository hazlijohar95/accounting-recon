'use client'

import React from 'react'
import { IconArrowDown, IconBank, IconCheckCircle } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { TruncatedText } from '@/components/brand'
import type { MatchPair } from '@/lib/store'

/**
 * Props for the PartialMatchGroup component.
 */
export interface PartialMatchGroupProps {
  matches: MatchPair[]
  selected: boolean
  onSelectMatch: (match: MatchPair) => void
  onApprove: (matchId: string) => void
  onReject: (matchId: string) => void
}

/**
 * Displays a group of partial matches - one bank transaction split across multiple invoices.
 *
 * Layout:
 * - Bank transaction header with total amount
 * - List of invoice matches with their individual amounts
 * - Total and variance summary
 * - Approve All / Reject All buttons
 */
export const PartialMatchGroup = React.memo(function PartialMatchGroup({
  matches,
  selected,
  onSelectMatch,
  onApprove,
  onReject,
}: PartialMatchGroupProps) {
  if (matches.length === 0) return null

  // Get the cash transaction from the first match (all share the same cash txn)
  const cashTxn = matches[0].cashTransaction
  const totalCashAmount = Math.abs(cashTxn.amount)

  // Calculate totals from matched invoices
  const totalMatchedAmount = matches.reduce(
    (sum, m) => sum + Math.abs(m.accrualTransaction.amount),
    0
  )
  const variance = totalCashAmount - totalMatchedAmount
  const variancePercent = totalCashAmount > 0 ? (Math.abs(variance) / totalCashAmount) * 100 : 0
  const isExact = Math.abs(variance) < 0.01

  const handleApproveAll = () => {
    matches.forEach(m => onApprove(m.id))
  }

  const handleRejectAll = () => {
    matches.forEach(m => onReject(m.id))
  }

  return (
    <div
      className={cn(
        'border-b border-border transition-colors',
        selected && 'bg-cyan-500/5'
      )}
    >
      {/* Bank Transaction Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-cyan-500/10 flex items-center justify-center">
              <IconBank size={14} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <TruncatedText
                text={cashTxn.description}
                maxWidth="250px"
                className="text-sm font-medium"
              />
              <div className="text-xs text-muted-foreground mt-0.5">{cashTxn.date}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-medium">
              ${totalCashAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Bank payment</div>
          </div>
        </div>
      </div>

      {/* Split Indicator */}
      <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground bg-background">
        <IconArrowDown size={12} className="text-cyan-500" />
        <span>Split into {matches.length} invoices</span>
      </div>

      {/* Invoice List */}
      <div className="px-4">
        {matches.map((match, index) => (
          <button
            key={match.id}
            onClick={() => onSelectMatch(match)}
            className={cn(
              'w-full py-2 text-left flex items-center gap-3 border-b border-border/30 last:border-b-0',
              'hover:bg-secondary/30 transition-colors',
              match.approved && 'opacity-60'
            )}
          >
            <div className="w-4 h-4 border border-cyan-500/50 flex items-center justify-center text-xs text-cyan-600">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {match.accrualDocument?.docNumber && (
                  <span className="text-xs font-mono bg-secondary px-1.5 py-0.5">
                    {match.accrualDocument.docNumber}
                  </span>
                )}
                <TruncatedText
                  text={match.accrualDocument?.description || match.accrualTransaction.description}
                  maxWidth="150px"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="text-sm font-mono">
              ${Math.abs(match.accrualTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {match.approved && (
              <IconCheckCircle size={14} className="text-success" />
            )}
          </button>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-3 bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Total: <span className="font-mono font-medium text-foreground">
              ${totalMatchedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </span>
          <span className={cn(
            isExact ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          )}>
            {isExact ? (
              'Exact match'
            ) : (
              <>Variance: ${Math.abs(variance).toFixed(2)} ({variancePercent.toFixed(1)}%)</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRejectAll}
            className="px-2 py-1 text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={handleApproveAll}
            className="px-2 py-1 text-xs bg-cyan-500 text-white hover:bg-cyan-600 transition-colors"
          >
            Approve All
          </button>
        </div>
      </div>
    </div>
  )
})
