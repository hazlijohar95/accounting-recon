'use client'

import React from 'react'
import { IconWarningCircle, IconSearch } from '@/components/brand/icons'
import { TruncatedText } from '@/components/brand'
import type { Transaction } from '@/lib/store'

/**
 * Props for the SuspenseRow component.
 */
export interface SuspenseRowProps {
  item: Transaction
  onFindMatch?: (item: Transaction) => void
}

/**
 * Suspense item row showing unmatched transaction with manual match option.
 *
 * Displays warning icon, description, amount, and "Find Match" button
 * that appears on hover to initiate manual matching.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
export const SuspenseRow = React.memo(function SuspenseRow({ item, onFindMatch }: SuspenseRowProps) {
  return (
    <div className="px-4 py-3 border-b border-border hover:bg-secondary/30 transition-colors group" role="listitem">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-warning/10 flex items-center justify-center" aria-hidden="true">
            <IconWarningCircle size={14} className="text-warning" />
          </div>
          <TruncatedText text={item.description} maxWidth="200px" className="text-sm" />
        </div>
        <div className="flex items-center gap-3">
          {onFindMatch && (
            <button
              onClick={() => onFindMatch(item)}
              aria-label={`Find match for ${item.description}`}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <IconSearch size={12} aria-hidden="true" />
              Find Match
            </button>
          )}
          <div className="text-amount-sm">
            ${Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2 pl-9">{item.date}</div>
    </div>
  )
})
