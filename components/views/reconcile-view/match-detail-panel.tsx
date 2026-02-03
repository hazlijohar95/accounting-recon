'use client'

/**
 * Match Detail Panel Component.
 *
 * Unified detail panel for desktop and mobile views.
 * Shows match confidence, transaction details, and action buttons.
 *
 * @module components/views/reconcile-view/match-detail-panel
 */

import React from 'react'
import type { MatchPair, Transaction } from '@/lib/store'
import { confidenceToPercent } from '@/lib/matching-utils'
import {
  IconCheck,
  IconX,
  IconArrowDown,
  IconCheckCircle,
  IconBank,
  IconFileText,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import {
  ConfidenceBar,
  ConfidenceGauge,
  MatchLayerBadge,
  TruncatedText,
  ButtonPrimary,
  ButtonDanger,
} from '@/components/brand'
import type { MatchLayer } from '@/components/brand'

// =============================================================================
// TRANSACTION CARD COMPONENT (shared)
// =============================================================================

interface TransactionCardProps {
  label: string
  icon: React.ReactNode
  tx: Transaction
  type: 'cash' | 'accrual'
}

/**
 * Transaction detail card showing amount, description, date, and category.
 */
function TransactionCard({ label, icon, tx, type }: TransactionCardProps) {
  const borderAccent = type === 'cash' ? 'border-l-emerald-500' : 'border-l-blue-500'

  return (
    <div className={cn('card-transaction border-l-2', borderAccent)}>
      {/* Card Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-label">{label}</span>
      </div>

      {/* Card Content */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-start">
          <span className="text-xs text-muted-foreground">Amount</span>
          <span className="text-amount">
            {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-start">
          <span className="text-xs text-muted-foreground">Description</span>
          <TruncatedText text={tx.description} maxWidth="180px" className="text-sm text-right" />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Date</span>
          <span className="text-sm">{tx.date}</span>
        </div>

        {tx.category && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Category</span>
            <span className="text-sm">{tx.category}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MATCH DETAIL PANEL CONTENT
// =============================================================================

interface MatchDetailPanelContentProps {
  match: MatchPair
  onApprove: (matchId: string) => void
  onReject: (matchId: string) => void
  showKeyboardHints?: boolean
}

/**
 * The actual content of the match detail panel (shared between desktop/mobile).
 */
function MatchDetailPanelContent({
  match,
  onApprove,
  onReject,
  showKeyboardHints = false,
}: MatchDetailPanelContentProps) {
  return (
    <>
      {/* Panel Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MatchLayerBadge layer={match.matchLayer as MatchLayer} size="md" />
            <span className="text-sm font-medium">Match Detail</span>
          </div>
          {match.approved && (
            <span className="flex items-center gap-1 text-xs text-success">
              <IconCheckCircle size={12} />
              Approved
            </span>
          )}
        </div>

        {/* Confidence Gauge - Medium Size */}
        <div className="flex justify-center py-2">
          <ConfidenceGauge
            value={confidenceToPercent(match.confidence)}
            size="md"
            animate={true}
            showLabel={true}
          />
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Full-width Confidence Bar */}
        <ConfidenceBar value={confidenceToPercent(match.confidence)} animate={true} showValue={true} />

        {/* Match Reasoning (for AI/Fuzzy matches) */}
        {match.matchReason && (match.matchLayer === 4 || match.matchLayer === 5) && (
          <div className={cn(
            'p-3 border text-sm',
            match.matchLayer === 5
              ? 'bg-blue-500/5 border-blue-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          )}>
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {match.matchLayer === 5 ? 'AI Analysis' : 'Match Reason'}
              </span>
            </div>
            <p className="mt-1 text-foreground/80">{match.matchReason}</p>
          </div>
        )}

        {/* Cash Transaction Card */}
        <TransactionCard
          label="Cash Transaction"
          icon={<IconBank size={16} />}
          tx={match.cashTransaction}
          type="cash"
        />

        {/* Arrow Connector */}
        <div className="arrow-connector">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center z-10">
            <IconArrowDown size={16} className="text-muted-foreground" />
          </div>
        </div>

        {/* Accrual Transaction Card */}
        <TransactionCard
          label="Accrual Record"
          icon={<IconFileText size={16} />}
          tx={match.accrualTransaction}
          type="accrual"
        />
      </div>

      {/* Action Buttons */}
      {!match.approved && (
        <div className="action-button-container">
          <ButtonDanger
            size="md"
            className={cn('flex-1', showKeyboardHints && 'relative')}
            onClick={() => onReject(match.id)}
          >
            <IconX size={16} className="mr-2" />
            Reject
            {showKeyboardHints && (
              <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] bg-background border border-border text-muted-foreground font-mono">
                R
              </span>
            )}
          </ButtonDanger>
          <ButtonPrimary
            size="md"
            className={cn('flex-1', showKeyboardHints && 'relative')}
            onClick={() => onApprove(match.id)}
          >
            <IconCheck size={16} className="mr-2" />
            Approve
            {showKeyboardHints && (
              <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] bg-background border border-border text-muted-foreground font-mono">
                A
              </span>
            )}
          </ButtonPrimary>
        </div>
      )}
    </>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

/**
 * Empty state when no match is selected.
 */
function MatchDetailEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 mb-4 bg-secondary flex items-center justify-center">
        <IconFileText size={24} className="text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">Select a match to view details</p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT - DESKTOP PANEL
// =============================================================================

export interface MatchDetailPanelProps {
  selectedMatch: MatchPair | null
  onApprove: (matchId: string) => void
  onReject: (matchId: string) => void
}

/**
 * Desktop side panel for match details.
 * Fixed position panel that shows match information and action buttons.
 */
export function MatchDetailPanel({
  selectedMatch,
  onApprove,
  onReject,
}: MatchDetailPanelProps) {
  return (
    <div className="hidden lg:flex w-96 flex-col bg-background border-l border-border">
      {selectedMatch ? (
        <MatchDetailPanelContent
          match={selectedMatch}
          onApprove={onApprove}
          onReject={onReject}
          showKeyboardHints={true}
        />
      ) : (
        <MatchDetailEmptyState />
      )}
    </div>
  )
}

// =============================================================================
// MOBILE OVERLAY PANEL
// =============================================================================

export interface MobileMatchDetailPanelProps {
  selectedMatch: MatchPair | null
  onApprove: (matchId: string) => void
  onReject: (matchId: string) => void
  onClose: () => void
}

/**
 * Mobile slide-over panel for match details.
 * Shows as overlay with backdrop and close button.
 */
export function MobileMatchDetailPanel({
  selectedMatch,
  onApprove,
  onReject,
  onClose,
}: MobileMatchDetailPanelProps) {
  if (!selectedMatch) return null

  return (
    <div className="lg:hidden fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Close details"
        >
          <IconX size={20} />
        </button>

        <MatchDetailPanelContent
          match={selectedMatch}
          onApprove={onApprove}
          onReject={onReject}
          showKeyboardHints={false}
        />
      </div>
    </div>
  )
}
