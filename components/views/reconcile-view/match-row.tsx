'use client'

import React from 'react'
import { IconCheckCircle, IconWarningCircle } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { confidenceToPercent } from '@/lib/matching-utils'
import { formatCurrency } from '@/lib/format'
import { MatchLayerBadge, TruncatedText } from '@/components/brand'
import type { MatchPair } from '@/lib/store'
import type { MatchLayer } from '@/components/brand'

/**
 * Props for the MatchRow component.
 */
export interface MatchRowProps {
  match: MatchPair
  selected: boolean
  onClick: () => void
  approved?: boolean
  showConfidenceWarning?: boolean
}

/**
 * Individual match row in the list with layer badge and confidence bar.
 *
 * Shows match layer indicator, transaction description, amount, and
 * inline confidence bar. Highlights when selected or approved.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
export const MatchRow = React.memo(function MatchRow({
  match,
  selected,
  onClick,
  approved = false,
  showConfidenceWarning = false,
}: MatchRowProps) {
  const confidencePercent = confidenceToPercent(match.confidence)
  const confidenceColor =
    match.confidence === 'high' ? 'bg-emerald-500' : match.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'

  // Determine warning message based on match reason/layer
  const getConfidenceWarning = () => {
    if (match.matchLayer === 5) return 'AI suggested match - verify manually'
    if (match.matchLayer === 4) return 'Fuzzy name match - verify counterparty'
    if (match.confidence === 'medium') return 'Medium confidence - review amounts'
    if (match.confidence === 'low') return 'Low confidence - careful review needed'
    return null
  }

  const warningMessage = showConfidenceWarning ? getConfidenceWarning() : null

  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full px-4 py-3 border-b border-border text-left transition-all duration-150',
        'hover:bg-secondary/50',
        selected && 'row-selected',
        approved && !selected && 'row-approved',
        showConfidenceWarning && !selected && 'bg-warning/5'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Layer Badge */}
        <MatchLayerBadge layer={match.matchLayer as MatchLayer} size="sm" />

        {/* Description */}
        <div className="flex-1 min-w-0">
          <TruncatedText
            text={match.cashTransaction.description}
            maxWidth="200px"
            className="text-sm"
          />
        </div>

        {/* Amount */}
        <div className="text-amount-sm">
          {formatCurrency(match.cashTransaction.amount)}
        </div>

        {/* Warning Icon for medium confidence */}
        {showConfidenceWarning && (
          <IconWarningCircle size={16} className="text-warning flex-shrink-0" aria-label="Needs review" />
        )}

        {/* Approved Icon */}
        {approved && (
          <IconCheckCircle size={16} className="text-success flex-shrink-0" aria-label="Approved" />
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pl-14">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{match.cashTransaction.date}</span>
          {/* Warning message */}
          {warningMessage && (
            <span className="text-xs text-warning/80 italic">{warningMessage}</span>
          )}
        </div>

        {/* Wider Confidence Bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1 bg-secondary overflow-hidden" role="progressbar" aria-valuenow={confidencePercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cn('h-full transition-all duration-500', confidenceColor)}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">{confidencePercent}%</span>
        </div>
      </div>
    </button>
  )
})
