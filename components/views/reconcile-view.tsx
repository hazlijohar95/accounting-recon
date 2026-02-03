'use client'

/**
 * Reconciliation View Component.
 *
 * The main reconciliation workspace where users review, approve, or reject
 * matched transactions, handle suspense items, and run the AI matching engine.
 *
 * Features:
 * - Tabbed interface: Pending, Matched, Suspense
 * - Match detail panel with confidence gauge
 * - Run matching engine (deterministic + AI layers)
 * - Manual match creation for suspense items
 * - AI assistant panel for help
 * - Celebration animation on successful matches
 *
 * Matching Layers:
 * - Layer 1: Exact match (amount + date)
 * - Layer 2: Window match (amount + date range)
 * - Layer 3: Reference match (reference numbers)
 * - Layer 4: Fuzzy match (pattern matching)
 * - Layer 5: AI semantic match (LLM-based)
 * - Layer 6: Manual match (user-created)
 *
 * @module components/views/reconcile-view
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useAppStore,
  MatchPair,
  Transaction,
  MatchConfidence,
} from '@/lib/store'
import { useReconcileData } from '@/lib/use-reconcile-data'
import { Id } from '@/convex/_generated/dataModel'
import { confidenceToPercent } from '@/lib/matching-utils'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import {
  IconCheck,
  IconX,
  IconWarningCircle,
  IconPlay,
  IconArrowDown,
  IconCheckCircle,
  IconBank,
  IconFileText,
  IconSearch,
  IconCommand,
  IconFilter,
  IconCaretDown,
  IconDollarSign,
} from '@/components/brand/icons'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useRunMatching, usePreviewMatching } from '@/lib/convex-hooks'
import { cn } from '@/lib/utils'
import {
  ConfidenceBar,
  ConfidenceGauge,
  MatchCelebration,
  MatchingStepIndicator,
  BrandedEmptyState,
  MatchLayerBadge,
  TruncatedText,
  ButtonPrimary,
  ButtonDanger,
  Skeleton,
  ManualMatchModal,
} from '@/components/brand'
import { ReconcileAssistant } from '@/components/ai'
import type { MatchLayer } from '@/components/brand'
import type { Tab, UndoAction, FilterState } from './reconcile-view/types'
import { initialFilterState } from './reconcile-view/types'
import { useReconcileState } from './reconcile-view/use-reconcile-state'
import { useMatchActions } from '@/hooks/useMatchActions'
import { MatchDetailPanel, MobileMatchDetailPanel } from './reconcile-view/match-detail-panel'
import { ReconcileFilterBar } from './reconcile-view/filter-bar'

/**
 * Main reconciliation workspace with match review and approval workflow.
 *
 * Provides a split-pane interface with match list on the left and
 * detail panel on the right. Supports running the 5-layer matching
 * engine and manual match creation.
 *
 * @example
 * ```tsx
 * // In app/(app)/reconcile/page.tsx
 * export default function ReconcilePage() {
 *   return <ReconcileView />
 * }
 * ```
 */
/**
 * ReconcileView wrapped with ErrorBoundary for graceful error handling.
 */
export function ReconcileView() {
  return (
    <ErrorBoundary componentName="ReconcileView">
      <ReconcileViewContent />
    </ErrorBoundary>
  )
}

function ReconcileViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get session ID from URL params (real mode) or fall back to store
  const urlSessionId = searchParams.get('sessionId')
  const convexSessionId = urlSessionId
    ? (urlSessionId as Id<'reconciliationSessions'>)
    : undefined

  // Use the unified data hook - handles demo/real mode automatically
  const {
    matches,
    pendingMatches: rawPendingMatches,
    approvedMatches: rawApprovedMatches,
    suspenseTransactions,
    sessionId,
    sessionName,
    isLoading: dataIsLoading,
    isDemo,
    counts,
  } = useReconcileData(convexSessionId)

  // Actions from store (they operate on current mode's data)
  const { showCelebration, setShowCelebration } = useAppStore()
  const { guardAction } = useDemoGuard()

  // Use consolidated state hook instead of 12+ individual useState calls
  const {
    activeTab,
    selectedMatch,
    manualMatchItem,
    isRunningMatching,
    isLoading,
    matchingResult,
    showKeyboardHelp,
    filters,
    showFilters,
    undoStack,
    hasActiveFilters,
    setActiveTab,
    setSelectedMatch,
    setManualMatchItem,
    setRunningMatching,
    setLoading,
    setMatchingResult,
    setShowKeyboardHelp,
    updateFilters,
    setShowFilters,
    clearFilters,
    pushUndo,
    popUndo,
    removeUndoByMatchId,
  } = useReconcileState()

  // Convex hooks for matching engine
  const runMatching = useRunMatching()
  const previewMatching = usePreviewMatching()

  // Apply filters to matches
  const filterMatches = useCallback((matchList: MatchPair[]) => {
    return matchList.filter((match) => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesSearch =
          match.cashTransaction.description.toLowerCase().includes(query) ||
          match.accrualTransaction.description.toLowerCase().includes(query) ||
          match.cashTransaction.category?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Match layer filter
      if (filters.matchLayers.length > 0 && !filters.matchLayers.includes(match.matchLayer)) {
        return false
      }

      // Confidence level filter
      if (filters.confidenceLevels.length > 0 && !filters.confidenceLevels.includes(match.confidence)) {
        return false
      }

      // Amount range filter
      const amount = Math.abs(match.cashTransaction.amount)
      if (filters.minAmount !== null && amount < filters.minAmount) return false
      if (filters.maxAmount !== null && amount > filters.maxAmount) return false

      // Date range filter
      if (filters.dateFrom && match.cashTransaction.date < filters.dateFrom) return false
      if (filters.dateTo && match.cashTransaction.date > filters.dateTo) return false

      return true
    })
  }, [filters])

  // Separate pending matches by confidence level:
  // - High confidence (≥90%): Show in "Pending" tab - ready for quick approval
  // - Medium confidence (70-89%): Show in "Review" tab - needs careful review
  const highConfidencePending = useMemo(() =>
    rawPendingMatches.filter((m) => m.confidence === 'high'),
    [rawPendingMatches]
  )
  const mediumConfidencePending = useMemo(() =>
    rawPendingMatches.filter((m) => m.confidence === 'medium' || m.confidence === 'low'),
    [rawPendingMatches]
  )

  const pendingMatches = useMemo(() =>
    filterMatches(highConfidencePending),
    [highConfidencePending, filterMatches]
  )
  const reviewMatches = useMemo(() =>
    filterMatches(mediumConfidencePending),
    [mediumConfidencePending, filterMatches]
  )
  const approvedMatches = useMemo(() =>
    filterMatches(rawApprovedMatches),
    [rawApprovedMatches, filterMatches]
  )
  // Suspense items are now from the unified hook
  const suspenseItems = suspenseTransactions

  // Get the correct list for the active tab
  const getActiveList = useCallback((tab: Tab) => {
    switch (tab) {
      case 'pending': return pendingMatches
      case 'review': return reviewMatches
      case 'matched': return approvedMatches
      default: return []
    }
  }, [pendingMatches, reviewMatches, approvedMatches])

  // Auto-select the first match in the active tab for a clearer default state
  useEffect(() => {
    const list = getActiveList(activeTab)
    if (list.length === 0) {
      if (selectedMatch) setSelectedMatch(null)
      return
    }
    if (!selectedMatch || !list.find((m) => m.id === selectedMatch.id)) {
      setSelectedMatch(list[0])
    }
  }, [activeTab, getActiveList, selectedMatch])

  // Get current match index for keyboard navigation
  const currentMatchIndex = useMemo(() => {
    if (!selectedMatch) return -1
    const list = getActiveList(activeTab)
    return list.findIndex((m) => m.id === selectedMatch.id)
  }, [selectedMatch, activeTab, getActiveList])

  // Use refs to avoid recreating the keyboard handler on every state change
  const stateRef = React.useRef({
    selectedMatch,
    activeTab,
    pendingMatches,
    reviewMatches,
    approvedMatches,
    currentMatchIndex,
    undoStack,
    getActiveList,
  })

  // Update refs when state changes (doesn't cause re-render)
  React.useEffect(() => {
    stateRef.current = {
      selectedMatch,
      activeTab,
      pendingMatches,
      reviewMatches,
      approvedMatches,
      currentMatchIndex,
      undoStack,
      getActiveList,
    }
  }, [selectedMatch, activeTab, pendingMatches, reviewMatches, approvedMatches, currentMatchIndex, undoStack, getActiveList])

  // Empty state for Real mode with no data (and not loading)
  const hasNoData =
    !isDemo && !dataIsLoading && matches.length === 0 && suspenseTransactions.length === 0

  if (hasNoData) {
    return (
      <BrandedEmptyState
        variant="reconcile"
        title="No matches to review"
        description="Start by uploading bank statements and invoices to generate matches."
        action={{
          label: 'Upload Documents',
          onClick: () => router.push('/upload'),
        }}
      />
    )
  }

  // Helper to auto-advance to next pending match
  const advanceToNextMatch = useCallback(() => {
    const currentIndex = currentMatchIndex
    const nextIndex = currentIndex + 1
    if (nextIndex < pendingMatches.length) {
      setSelectedMatch(pendingMatches[nextIndex])
    } else if (pendingMatches.length > 0) {
      setSelectedMatch(pendingMatches[0])
    } else {
      setSelectedMatch(null)
    }
  }, [currentMatchIndex, pendingMatches, setSelectedMatch])

  // Use unified match actions hook - handles approval/rejection workflow
  const {
    handleApprove,
    handleReject,
    handleUndo: matchActionsUndo,
  } = useMatchActions({
    matches,
    onApproveSuccess: advanceToNextMatch,
    onRejectSuccess: advanceToNextMatch,
    pushUndo,
    removeUndoByMatchId,
  })

  // Wrapper for undo that provides current stack
  const handleUndo = useCallback(() => {
    matchActionsUndo(undoStack, popUndo)
  }, [matchActionsUndo, undoStack, popUndo])

  // Keyboard shortcuts effect - handler is stable, uses refs for current state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const { selectedMatch: match, activeTab: tab, currentMatchIndex: idx, undoStack: undo, getActiveList: getList } = stateRef.current
      const currentList = getList(tab)

      switch (e.key.toLowerCase()) {
        case 'a':
          // Approve current match
          if (match && !match.approved && tab === 'pending') {
            e.preventDefault()
            handleApprove(match.id)
          }
          break
        case 'r':
          // Reject current match
          if (match && !match.approved && tab === 'pending') {
            e.preventDefault()
            handleReject(match.id)
          }
          break
        case 's':
        case 'arrowdown':
        case 'j':
          // Skip to next match
          e.preventDefault()
          if (currentList.length > 0) {
            const nextIndex = idx < currentList.length - 1 ? idx + 1 : 0
            setSelectedMatch(currentList[nextIndex])
          }
          break
        case 'arrowup':
        case 'k':
          // Go to previous match
          e.preventDefault()
          if (currentList.length > 0) {
            const prevIndex = idx > 0 ? idx - 1 : currentList.length - 1
            setSelectedMatch(currentList[prevIndex])
          }
          break
        case '?':
          // Show keyboard shortcuts help
          e.preventDefault()
          setShowKeyboardHelp(true)
          break
        case 'escape':
          // Close modals
          setShowKeyboardHelp(false)
          setShowFilters(false)
          break
        case '/':
          // Focus search
          e.preventDefault()
          setShowFilters(true)
          break
        case 'z':
          // Undo (Ctrl/Cmd + Z)
          if ((e.ctrlKey || e.metaKey) && undo.length > 0) {
            e.preventDefault()
            handleUndo()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleApprove, handleReject, handleUndo])

  // clearFilters is provided by useReconcileState hook

  // Handle running the matching engine
  const handleRunMatching = useCallback(
    async (useLLM: boolean = false) => {
      if (guardAction()) return

      if (!sessionId) {
        console.warn('No active session - cannot run matching')
        return
      }

      setRunningMatching(true)
      setMatchingResult(null)

      try {
        const result = await runMatching(sessionId, useLLM)
        if (result.success) {
          setMatchingResult({
            totalMatches: result.totalMatches,
            matchesByLayer: result.matchesByLayer,
            suspenseItems: result.suspenseItems,
          })
          if (result.totalMatches > 0) {
            setShowCelebration(true)
          }
        }
      } catch (error) {
        console.error('Matching failed:', error)
      } finally {
        setRunningMatching(false)
      }
    },
    [guardAction, sessionId, runMatching, setShowCelebration]
  )

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false)
  }, [setShowCelebration])

  // Handle opening manual match modal
  const handleFindMatch = useCallback((item: Transaction) => {
    setManualMatchItem(item)
  }, [])

  // Handle manual match created
  const handleManualMatchCreated = useCallback(() => {
    setManualMatchItem(null)
    setActiveTab('pending') // Switch to pending tab to show new match
    setShowCelebration(true)
  }, [setShowCelebration])

  const getTabEmptyState = (tab: Tab) => {
    switch (tab) {
      case 'pending':
        return {
          icon: <IconFileText size={32} className="text-muted-foreground/40" />,
          title: 'No high-confidence matches',
          description: 'All high-confidence matches have been reviewed. Check the Review tab for medium-confidence matches.',
          className: 'empty-state-pending',
        }
      case 'review':
        return {
          icon: <IconCheckCircle size={32} className="text-success/40" />,
          title: 'No matches need review',
          description: 'All medium-confidence matches have been reviewed. Great work!',
          className: 'empty-state-review',
        }
      case 'matched':
        return {
          icon: <IconCheckCircle size={32} className="text-success/40" />,
          title: 'No approved matches yet',
          description: 'Review and approve pending matches to see them here.',
          className: 'empty-state-matched',
        }
      case 'suspense':
        return {
          icon: <IconWarningCircle size={32} className="text-warning/40" />,
          title: 'Nothing needs manual matching',
          description: "Transactions we couldn't match automatically will appear here.",
          className: 'empty-state-suspense',
        }
    }
  }

  return (
    <div className="flex h-full relative">
      {/* Match celebration overlay */}
      <MatchCelebration show={showCelebration} onComplete={handleCelebrationComplete} />

      {/* Main List */}
      <div className="flex-1 flex flex-col border-r border-border relative">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium">Reconciliation</h1>
            {/* Keyboard shortcuts hint */}
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary/50 transition-colors"
              title="Keyboard shortcuts"
            >
              <IconCommand size={12} />
              <span className="hidden sm:inline">?</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Run Matching Buttons */}
            <div className="flex items-center gap-2">
              <ButtonPrimary
                size="sm"
                onClick={() => handleRunMatching(false)}
                disabled={isRunningMatching || isDemo}
                loading={isRunningMatching}
                icon={<IconPlay size={12} />}
              >
                {isRunningMatching ? 'Matching...' : 'Run Matching'}
              </ButtonPrimary>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">AI Pipeline</span>
            <MatchingStepIndicator currentStep={3} />
          </div>
        </div>

        {/* Search and Filter Bar */}
        <ReconcileFilterBar
          filters={filters}
          showFilters={showFilters}
          hasActiveFilters={hasActiveFilters}
          activeTab={activeTab}
          pendingMatchCount={pendingMatches.length}
          approvedMatchCount={approvedMatches.length}
          onUpdateFilters={updateFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={clearFilters}
        />

        {/* Matching Result Banner */}
        {matchingResult && (
          <div className="px-4 py-3 bg-success/10 border-b border-success/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <IconCheckCircle size={16} className="text-success" />
              <span className="text-sm font-medium text-success">Matching Complete</span>
              <span className="text-xs text-muted-foreground">
                {matchingResult.totalMatches} matches found
                {matchingResult.matchesByLayer[1] && ` (${matchingResult.matchesByLayer[1]} exact)`}
                {matchingResult.matchesByLayer[5] && ` (${matchingResult.matchesByLayer[5]} AI)`}
              </span>
            </div>
            <button
              onClick={() => setMatchingResult(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border" role="tablist" aria-label="Reconciliation tabs">
          {(['pending', 'review', 'matched', 'suspense'] as Tab[]).map((tab) => {
            // Tab labels and descriptions
            const tabConfig: Record<Tab, { label: string; description: string }> = {
              pending: { label: 'Ready', description: 'High confidence, ready to approve' },
              review: { label: 'Review', description: 'Medium confidence, needs careful review' },
              matched: { label: 'Matched', description: 'Approved matches' },
              suspense: { label: 'Suspense', description: 'Unmatched items' },
            }
            const { label: tabLabel } = tabConfig[tab]
            const count =
              tab === 'pending'
                ? pendingMatches.length
                : tab === 'review'
                  ? reviewMatches.length
                  : tab === 'matched'
                    ? approvedMatches.length
                    : suspenseItems.length
            return (
              <button
                key={tab}
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab)
                  setSelectedMatch(null)
                }}
                className={cn(
                  'px-4 py-3 text-sm capitalize transition-colors relative',
                  activeTab === tab
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tabLabel}
                <span
                  className={cn(
                    'ml-1.5 px-1.5 py-0.5 text-xs',
                    activeTab === tab ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  )}
                  aria-label={`${count} items`}
                >
                  {count}
                </span>
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        {/* List Content */}
        <div
          className="flex-1 overflow-auto"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {/* Loading Skeleton */}
          {(isLoading || dataIsLoading) && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchRow key={i} />
              ))}
            </>
          )}

          {/* Pending Matches (High Confidence - Ready to Approve) */}
          {!(isLoading || dataIsLoading) && activeTab === 'pending' && (
            <>
              {pendingMatches.length > 0 && (
                <div className="px-4 py-2 bg-success/5 border-b border-success/20 text-xs text-success flex items-center gap-2">
                  <IconCheckCircle size={12} />
                  <span>High confidence matches - quick approve recommended</span>
                </div>
              )}
              {pendingMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  selected={selectedMatch?.id === match.id}
                  onClick={() => setSelectedMatch(match)}
                />
              ))}
            </>
          )}

          {/* Review Matches (Medium/Low Confidence - Needs Careful Review) */}
          {!(isLoading || dataIsLoading) && activeTab === 'review' && (
            <>
              {reviewMatches.length > 0 && (
                <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs text-warning flex items-center gap-2">
                  <IconWarningCircle size={12} />
                  <span>Medium confidence - please verify these matches carefully</span>
                </div>
              )}
              {reviewMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  selected={selectedMatch?.id === match.id}
                  onClick={() => setSelectedMatch(match)}
                  showConfidenceWarning
                />
              ))}
            </>
          )}

          {/* Approved Matches */}
          {!(isLoading || dataIsLoading) && activeTab === 'matched' && (
            <>
              {approvedMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  selected={selectedMatch?.id === match.id}
                  onClick={() => setSelectedMatch(match)}
                  approved
                />
              ))}
            </>
          )}

          {/* Suspense Items */}
          {!(isLoading || dataIsLoading) && activeTab === 'suspense' && (
            <>
              {suspenseItems.map((item) => (
                <SuspenseRow key={item.id} item={item} onFindMatch={handleFindMatch} />
              ))}
            </>
          )}

          {/* Empty States */}
          {!(isLoading || dataIsLoading) &&
            ((activeTab === 'pending' && pendingMatches.length === 0) ||
              (activeTab === 'review' && reviewMatches.length === 0) ||
              (activeTab === 'matched' && approvedMatches.length === 0) ||
              (activeTab === 'suspense' && suspenseItems.length === 0)) && (
              <TabEmptyState {...getTabEmptyState(activeTab)} />
            )}
        </div>

        {/* AI Reconciliation Assistant - Centered within this section */}
        <ReconcileAssistant
          className="assistant-container--in-reconcile"
          sessionId={sessionId as string}
          companyName={sessionName}
          matches={matches}
          pendingMatches={pendingMatches}
          suspenseItems={suspenseItems}
          onApproveMatch={handleApprove}
          onRejectMatch={handleReject}
        />
      </div>

      {/* Detail Panel - Fixed on desktop (lg+), Overlay on tablet/mobile */}
      {/* Desktop: Side panel */}
      <MatchDetailPanel
        selectedMatch={selectedMatch}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Mobile/Tablet: Slide-over panel overlay */}
      <MobileMatchDetailPanel
        selectedMatch={selectedMatch}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => setSelectedMatch(null)}
      />

      {/* Manual Match Modal */}
      {manualMatchItem && (
        <ManualMatchModal
          suspenseItem={manualMatchItem}
          onClose={() => setManualMatchItem(null)}
          onMatchCreated={handleManualMatchCreated}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <KeyboardShortcutsModal onClose={() => setShowKeyboardHelp(false)} />
      )}
    </div>
  )
}

// =============================================================================
// MATCH ROW COMPONENT
// =============================================================================

/**
 * Props for the MatchRow component.
 */
interface MatchRowProps {
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
const MatchRow = React.memo(function MatchRow({
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
          ${Math.abs(match.cashTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

// =============================================================================
// SUSPENSE ROW COMPONENT
// =============================================================================

/**
 * Props for the SuspenseRow component.
 */
interface SuspenseRowProps {
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
const SuspenseRow = React.memo(function SuspenseRow({ item, onFindMatch }: SuspenseRowProps) {
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

// =============================================================================
// SKELETON MATCH ROW
// =============================================================================

/**
 * Loading skeleton placeholder for match rows during data fetching.
 */
function SkeletonMatchRow() {
  return (
    <div className="skeleton-match-row">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-5" />
        <Skeleton className="flex-1 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
      <div className="flex items-center justify-between pl-14 mt-1">
        <Skeleton className="w-20 h-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-1" />
          <Skeleton className="w-10 h-3" />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// TAB EMPTY STATE
// =============================================================================

/**
 * Props for the TabEmptyState component.
 */
interface TabEmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
}

/**
 * Empty state displayed when a tab has no items to show.
 *
 * Shows contextual icon, title, and description based on the tab type.
 */
function TabEmptyState({ icon, title, description, className }: TabEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-64 p-6', className)}>
      <div className="mb-4">{icon}</div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground text-center max-w-[240px]">{description}</p>
    </div>
  )
}

// =============================================================================
// KEYBOARD SHORTCUTS MODAL
// =============================================================================

const keyboardShortcuts = [
  { key: 'A', description: 'Approve current match', category: 'Actions' },
  { key: 'R', description: 'Reject current match', category: 'Actions' },
  { key: '↓ / S / J', description: 'Skip to next match', category: 'Navigation' },
  { key: '↑ / K', description: 'Go to previous match', category: 'Navigation' },
  { key: '/', description: 'Focus search bar', category: 'Navigation' },
  { key: '?', description: 'Show this help', category: 'Help' },
  { key: 'Ctrl+Z', description: 'Undo last action', category: 'Actions' },
  { key: 'Esc', description: 'Close modals', category: 'Help' },
]

/**
 * Modal displaying keyboard shortcuts for power users.
 */
function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const categories = ['Actions', 'Navigation', 'Help']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <IconCommand size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-medium">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
              <div className="space-y-2">
                {keyboardShortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs bg-secondary border border-border font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 text-[10px] bg-background border border-border font-mono">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  )
}
