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
import { useRouter } from 'next/navigation'
import {
  useAppStore,
  useMatchesSafe,
  useCashTransactionsSafe,
  useAccrualTransactionsSafe,
  useAccrualDocumentsSafe,
  useActiveSessionSafe,
  MatchPair,
  Transaction,
  MatchConfidence,
} from '@/lib/store'
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
import { useToast } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useRunMatching, usePreviewMatching, useApproveMatch, useRejectMatch } from '@/lib/convex-hooks'
import { Id } from '@/convex/_generated/dataModel'
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
  // Mode-aware selectors - automatically return correct data based on isDemo
  const matches = useMatchesSafe()
  const cashTransactions = useCashTransactionsSafe()
  const accrualTransactions = useAccrualTransactionsSafe()
  const accrualDocuments = useAccrualDocumentsSafe()
  const activeSession = useActiveSessionSafe()
  // Actions still from store (they operate on current mode's data)
  const { approveMatch, rejectMatch, showCelebration, setShowCelebration } = useAppStore()
  const { isDemo, guardAction } = useDemoGuard()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [selectedMatch, setSelectedMatch] = useState<MatchPair | null>(null)
  const [manualMatchItem, setManualMatchItem] = useState<Transaction | null>(null)
  const [isRunningMatching, setIsRunningMatching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [matchingResult, setMatchingResult] = useState<{
    totalMatches: number
    matchesByLayer: Record<number, number>
    suspenseItems: number
  } | null>(null)
  // New state for UX improvements
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [filters, setFilters] = useState<FilterState>(initialFilterState)
  const [showFilters, setShowFilters] = useState(false)
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const MAX_UNDO_STACK = 10

  // SAFETY: Track mounted state to prevent state updates after unmount
  const isMountedRef = React.useRef(true)
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Convex hooks for matching engine
  const runMatching = useRunMatching()
  const previewMatching = usePreviewMatching()

  // Convex hooks for match persistence
  const approveMatchBackend = useApproveMatch()
  const rejectMatchBackend = useRejectMatch()

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

  const pendingMatches = useMemo(() =>
    filterMatches(matches.filter((m) => !m.approved)),
    [matches, filterMatches]
  )
  const approvedMatches = useMemo(() =>
    filterMatches(matches.filter((m) => m.approved)),
    [matches, filterMatches]
  )
  const suspenseItems = cashTransactions.filter((t) => t.status === 'suspense')

  // Auto-select the first match in the active tab for a clearer default state
  useEffect(() => {
    const list = activeTab === 'pending' ? pendingMatches : approvedMatches
    if (list.length === 0) {
      if (selectedMatch) setSelectedMatch(null)
      return
    }
    if (!selectedMatch || !list.find((m) => m.id === selectedMatch.id)) {
      setSelectedMatch(list[0])
    }
  }, [activeTab, pendingMatches, approvedMatches, selectedMatch])

  // Get current match index for keyboard navigation
  const currentMatchIndex = useMemo(() => {
    if (!selectedMatch) return -1
    const list = activeTab === 'pending' ? pendingMatches : approvedMatches
    return list.findIndex((m) => m.id === selectedMatch.id)
  }, [selectedMatch, activeTab, pendingMatches, approvedMatches])

  // Use refs to avoid recreating the keyboard handler on every state change
  const stateRef = React.useRef({
    selectedMatch,
    activeTab,
    pendingMatches,
    approvedMatches,
    currentMatchIndex,
    undoStack,
  })

  // Update refs when state changes (doesn't cause re-render)
  React.useEffect(() => {
    stateRef.current = {
      selectedMatch,
      activeTab,
      pendingMatches,
      approvedMatches,
      currentMatchIndex,
      undoStack,
    }
  }, [selectedMatch, activeTab, pendingMatches, approvedMatches, currentMatchIndex, undoStack])

  // Empty state for Real mode with no data
  const hasNoData =
    !isDemo && matches.length === 0 && cashTransactions.length === 0 && accrualTransactions.length === 0

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
  }, [currentMatchIndex, pendingMatches])

  const handleApprove = useCallback(
    async (matchId: string) => {
      if (guardAction()) return

      // Store for undo before approving
      const matchToApprove = matches.find((m) => m.id === matchId)
      if (matchToApprove) {
        const undoAction: UndoAction = {
          id: crypto.randomUUID(),
          type: 'approve',
          matchId,
          match: { ...matchToApprove },
          timestamp: Date.now(),
        }
        setUndoStack((prev) => [undoAction, ...prev].slice(0, MAX_UNDO_STACK))
      }

      setShowCelebration(true)
      approveMatch(matchId) // Local store (optimistic update)

      // Persist to backend - handle ID format (local uses string, backend uses Id)
      try {
        await approveMatchBackend(matchId as Id<"matchedPairs">)
      } catch (error) {
        console.error('Failed to persist match approval:', error)

        // SAFETY: Check if component is still mounted before state updates
        if (!isMountedRef.current) return

        // ROLLBACK: Revert local state on backend failure
        const store = useAppStore.getState()
        const updatedMatches = store.matches.map((m) =>
          m.id === matchId ? { ...m, approved: false } : m
        )
        useAppStore.setState({ matches: updatedMatches })

        // Remove from undo stack since we're rolling back
        setUndoStack((prev) => prev.filter((a) => a.matchId !== matchId))

        toast.addToast({
          type: 'error',
          title: 'Failed to save',
          description: 'Match approval could not be saved. Please try again.',
          duration: 5000,
        })
        return // Don't advance or show success toast
      }

      // SAFETY: Check if component is still mounted before state updates
      if (!isMountedRef.current) return

      // Only advance to next match AFTER backend confirmation
      advanceToNextMatch()

      // Show toast with undo option (only on success)
      toast.addToast({
        type: 'success',
        title: 'Match approved',
        description: 'Press Ctrl+Z to undo',
        duration: 5000,
      })
    },
    [guardAction, setShowCelebration, approveMatch, matches, advanceToNextMatch, toast, approveMatchBackend]
  )

  const handleReject = useCallback(
    async (matchId: string) => {
      if (guardAction()) return

      // Store for undo before rejecting
      const matchToReject = matches.find((m) => m.id === matchId)
      if (matchToReject) {
        const undoAction: UndoAction = {
          id: crypto.randomUUID(),
          type: 'reject',
          matchId,
          match: { ...matchToReject },
          timestamp: Date.now(),
        }
        setUndoStack((prev) => [undoAction, ...prev].slice(0, MAX_UNDO_STACK))
      }

      rejectMatch(matchId) // Local store (optimistic update)

      // Persist to backend - handle ID format (local uses string, backend uses Id)
      try {
        await rejectMatchBackend(matchId as Id<"matchedPairs">)
      } catch (error) {
        console.error('Failed to persist match rejection:', error)

        // SAFETY: Check if component is still mounted before state updates
        if (!isMountedRef.current) return

        // ROLLBACK: Re-add the match back to the list on backend failure
        if (matchToReject) {
          const store = useAppStore.getState()
          // Avoid duplicates - only add if not already present
          const exists = store.matches.some((m) => m.id === matchToReject.id)
          if (!exists) {
            useAppStore.setState({ matches: [...store.matches, matchToReject] })
          }
        }

        // Remove from undo stack since we're rolling back
        setUndoStack((prev) => prev.filter((a) => a.matchId !== matchId))

        toast.addToast({
          type: 'error',
          title: 'Failed to save',
          description: 'Match rejection could not be saved. Please try again.',
          duration: 5000,
        })
        return // Don't advance or show success toast
      }

      // SAFETY: Check if component is still mounted before state updates
      if (!isMountedRef.current) return

      // Only advance to next match AFTER backend confirmation
      advanceToNextMatch()

      // Show toast with undo option (only on success)
      toast.addToast({
        type: 'info',
        title: 'Match rejected',
        description: 'Press Ctrl+Z to undo',
        duration: 5000,
      })
    },
    [guardAction, rejectMatch, matches, advanceToNextMatch, toast, rejectMatchBackend]
  )

  // Undo last action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    const lastAction = undoStack[0]
    setUndoStack((prev) => prev.slice(1))

    try {
      // Restore the match to pending state
      // Note: This is a simplified undo that works with local store.
      // For Convex, you'd need a proper revert mutation.
      if (lastAction.type === 'approve') {
        // In the local store, approved matches are still in the list
        // We need to toggle their approved state back
        const store = useAppStore.getState()
        const updatedMatches = store.matches.map((m) =>
          m.id === lastAction.matchId ? { ...m, approved: false } : m
        )
        useAppStore.setState({ matches: updatedMatches })
      } else if (lastAction.type === 'reject') {
        // Re-add the rejected match back to the list
        const store = useAppStore.getState()
        // Avoid duplicates - only add if not already present
        const exists = store.matches.some((m) => m.id === lastAction.match.id)
        if (!exists) {
          useAppStore.setState({ matches: [...store.matches, lastAction.match] })
        }
      }

      toast.addToast({
        type: 'success',
        title: 'Action undone',
        description: `Match ${lastAction.type === 'approve' ? 'un-approved' : 'restored'}`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Undo failed:', error)
      toast.addToast({
        type: 'error',
        title: 'Undo failed',
        description: 'Could not restore the previous state',
        duration: 3000,
      })
    }
  }, [undoStack, toast])

  // Keyboard shortcuts effect - handler is stable, uses refs for current state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const { selectedMatch: match, activeTab: tab, pendingMatches: pending, approvedMatches: approved, currentMatchIndex: idx, undoStack: undo } = stateRef.current
      const currentList = tab === 'pending' ? pending : approved

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

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilterState)
  }, [])

  // Handle running the matching engine
  const handleRunMatching = useCallback(
    async (useLLM: boolean = false) => {
      if (guardAction()) return

      if (!activeSession?.id) {
        console.warn('No active session - cannot run matching')
        return
      }

      setIsRunningMatching(true)
      setMatchingResult(null)

      try {
        const result = await runMatching(activeSession.id as Id<'reconciliationSessions'>, useLLM)
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
        setIsRunningMatching(false)
      }
    },
    [guardAction, activeSession, runMatching, setShowCelebration]
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
          title: 'No pending matches',
          description: 'All matches have been reviewed. Run the matching engine to find new matches.',
          className: 'empty-state-pending',
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
          title: 'Nothing needs review',
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
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search transactions... (/)"
                value={filters.searchQuery}
                onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                aria-label="Search transactions"
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              aria-label={`Filters${filters.matchLayers.length + filters.confidenceLevels.length > 0 ? ` (${filters.matchLayers.length + filters.confidenceLevels.length} active)` : ''}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm border transition-colors',
                showFilters ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-secondary/50',
                (filters.matchLayers.length > 0 || filters.confidenceLevels.length > 0 || filters.minAmount !== null || filters.maxAmount !== null) && 'border-foreground'
              )}
            >
              <IconFilter size={16} aria-hidden="true" />
              Filters
              {(filters.matchLayers.length > 0 || filters.confidenceLevels.length > 0) && (
                <span className="px-1.5 py-0.5 text-[10px] bg-foreground text-background rounded-full" aria-hidden="true">
                  {filters.matchLayers.length + filters.confidenceLevels.length}
                </span>
              )}
              <IconCaretDown size={12} className={cn('transition-transform', showFilters && 'rotate-180')} aria-hidden="true" />
            </button>

            {/* Clear Filters */}
            {(filters.searchQuery || filters.matchLayers.length > 0 || filters.confidenceLevels.length > 0 || filters.minAmount !== null || filters.maxAmount !== null) && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}

            {/* Results count */}
            <span className="text-xs text-muted-foreground ml-auto">
              {activeTab === 'pending' ? pendingMatches.length : approvedMatches.length} matches
            </span>
          </div>

          {/* Expanded Filters Panel */}
          {showFilters && (
            <div id="filter-panel" className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Match Layer Filter */}
              <fieldset>
                <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Match Layer</legend>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by match layer">
                  {([1, 2, 3, 4, 5, 6] as const).map((layer) => (
                    <button
                      key={layer}
                      aria-pressed={filters.matchLayers.includes(layer)}
                      onClick={() => {
                        setFilters((f) => ({
                          ...f,
                          matchLayers: f.matchLayers.includes(layer)
                            ? f.matchLayers.filter((l) => l !== layer)
                            : [...f.matchLayers, layer],
                        }))
                      }}
                      className={cn(
                        'px-2 py-1 text-xs border transition-colors',
                        filters.matchLayers.includes(layer)
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border hover:bg-secondary/50'
                      )}
                    >
                      L{layer}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Confidence Filter */}
              <fieldset>
                <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Confidence</legend>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by confidence level">
                  {(['high', 'medium', 'low'] as const).map((level) => (
                    <button
                      key={level}
                      aria-pressed={filters.confidenceLevels.includes(level)}
                      onClick={() => {
                        setFilters((f) => ({
                          ...f,
                          confidenceLevels: f.confidenceLevels.includes(level)
                            ? f.confidenceLevels.filter((l) => l !== level)
                            : [...f.confidenceLevels, level],
                        }))
                      }}
                      className={cn(
                        'px-2 py-1 text-xs border transition-colors capitalize',
                        filters.confidenceLevels.includes(level)
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border hover:bg-secondary/50'
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Amount Range Filter */}
              <fieldset>
                <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Amount Range</legend>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <IconDollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                      type="number"
                      placeholder="Min"
                      aria-label="Minimum amount"
                      value={filters.minAmount ?? ''}
                      onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                    />
                  </div>
                  <span className="text-muted-foreground" aria-hidden="true">-</span>
                  <div className="relative flex-1">
                    <IconDollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                      type="number"
                      placeholder="Max"
                      aria-label="Maximum amount"
                      value={filters.maxAmount ?? ''}
                      onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Date Range Filter */}
              <fieldset>
                <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Date Range</legend>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Start date"
                    value={filters.dateFrom ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))}
                    className="flex-1 px-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground" aria-hidden="true">-</span>
                  <input
                    type="date"
                    aria-label="End date"
                    value={filters.dateTo ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))}
                    className="flex-1 px-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                  />
                </div>
              </fieldset>
            </div>
          )}
        </div>

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
          {(['pending', 'matched', 'suspense'] as Tab[]).map((tab) => {
            const tabLabel = tab === 'suspense' ? 'needs review' : tab
            const count =
              tab === 'pending'
                ? pendingMatches.length
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
          {isLoading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchRow key={i} />
              ))}
            </>
          )}

          {/* Pending Matches */}
          {!isLoading && activeTab === 'pending' && (
            <>
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

          {/* Approved Matches */}
          {!isLoading && activeTab === 'matched' && (
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
          {!isLoading && activeTab === 'suspense' && (
            <>
              {suspenseItems.map((item) => (
                <SuspenseRow key={item.id} item={item} onFindMatch={handleFindMatch} />
              ))}
            </>
          )}

          {/* Empty States */}
          {!isLoading &&
            ((activeTab === 'pending' && pendingMatches.length === 0) ||
              (activeTab === 'matched' && approvedMatches.length === 0) ||
              (activeTab === 'suspense' && suspenseItems.length === 0)) && (
              <TabEmptyState {...getTabEmptyState(activeTab)} />
            )}
        </div>

        {/* AI Reconciliation Assistant - Centered within this section */}
        <ReconcileAssistant
          className="assistant-container--in-reconcile"
          sessionId={activeSession?.id}
          companyName={activeSession?.name}
          matches={matches}
          pendingMatches={pendingMatches}
          suspenseItems={suspenseItems}
          onApproveMatch={handleApprove}
          onRejectMatch={handleReject}
        />
      </div>

      {/* Detail Panel - Fixed on desktop (lg+), Overlay on tablet/mobile */}
      {/* Desktop: Side panel */}
      <div className="hidden lg:flex w-96 flex-col bg-background border-l border-border">
        {selectedMatch ? (
          <>
            {/* Panel Header */}
            <div className="panel-header">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MatchLayerBadge layer={selectedMatch.matchLayer as MatchLayer} size="md" />
                  <span className="text-sm font-medium">Match Detail</span>
                </div>
                {selectedMatch.approved && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <IconCheckCircle size={12} />
                    Approved
                  </span>
                )}
              </div>

              {/* Confidence Gauge - Medium Size */}
              <div className="flex justify-center py-2">
                <ConfidenceGauge
                  value={confidenceToPercent(selectedMatch.confidence)}
                  size="md"
                  animate={true}
                  showLabel={true}
                />
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              {/* Full-width Confidence Bar */}
              <ConfidenceBar value={confidenceToPercent(selectedMatch.confidence)} animate={true} showValue={true} />

              {/* Cash Transaction Card */}
              <TransactionCard
                label="Cash Transaction"
                icon={<IconBank size={16} />}
                tx={selectedMatch.cashTransaction}
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
                tx={selectedMatch.accrualTransaction}
                type="accrual"
              />
            </div>

            {/* Action Buttons with Keyboard Hints */}
            {!selectedMatch.approved && (
              <div className="action-button-container">
                <ButtonDanger size="md" className="flex-1 relative" onClick={() => handleReject(selectedMatch.id)}>
                  <IconX size={16} className="mr-2" />
                  Reject
                  <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] bg-background border border-border text-muted-foreground font-mono">R</span>
                </ButtonDanger>
                <ButtonPrimary size="md" className="flex-1 relative" onClick={() => handleApprove(selectedMatch.id)}>
                  <IconCheck size={16} className="mr-2" />
                  Approve
                  <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] bg-background border border-border text-muted-foreground font-mono">A</span>
                </ButtonPrimary>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 mb-4 bg-secondary flex items-center justify-center">
              <IconFileText size={24} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Select a match to view details</p>
          </div>
        )}
      </div>

      {/* Mobile/Tablet: Slide-over panel overlay */}
      {selectedMatch && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedMatch(null)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
            {/* Close button for mobile */}
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label="Close details"
            >
              <IconX size={20} />
            </button>

            {/* Panel Header */}
            <div className="panel-header">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MatchLayerBadge layer={selectedMatch.matchLayer as MatchLayer} size="md" />
                  <span className="text-sm font-medium">Match Detail</span>
                </div>
                {selectedMatch.approved && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <IconCheckCircle size={12} />
                    Approved
                  </span>
                )}
              </div>

              {/* Confidence Gauge - Medium Size */}
              <div className="flex justify-center py-2">
                <ConfidenceGauge
                  value={confidenceToPercent(selectedMatch.confidence)}
                  size="md"
                  animate={true}
                  showLabel={true}
                />
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              {/* Full-width Confidence Bar */}
              <ConfidenceBar value={confidenceToPercent(selectedMatch.confidence)} animate={true} showValue={true} />

              {/* Cash Transaction Card */}
              <TransactionCard
                label="Cash Transaction"
                icon={<IconBank size={16} />}
                tx={selectedMatch.cashTransaction}
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
                tx={selectedMatch.accrualTransaction}
                type="accrual"
              />
            </div>

            {/* Action Buttons */}
            {!selectedMatch.approved && (
              <div className="action-button-container">
                <ButtonDanger size="md" className="flex-1" onClick={() => handleReject(selectedMatch.id)}>
                  <IconX size={16} className="mr-2" />
                  Reject
                </ButtonDanger>
                <ButtonPrimary size="md" className="flex-1" onClick={() => handleApprove(selectedMatch.id)}>
                  <IconCheck size={16} className="mr-2" />
                  Approve
                </ButtonPrimary>
              </div>
            )}
          </div>
        </div>
      )}

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
}

/**
 * Individual match row in the list with layer badge and confidence bar.
 *
 * Shows match layer indicator, transaction description, amount, and
 * inline confidence bar. Highlights when selected or approved.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
const MatchRow = React.memo(function MatchRow({ match, selected, onClick, approved = false }: MatchRowProps) {
  const confidencePercent = confidenceToPercent(match.confidence)
  const confidenceColor =
    match.confidence === 'high' ? 'bg-emerald-500' : match.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full px-4 py-3 border-b border-border text-left transition-all duration-150',
        'hover:bg-secondary/50',
        selected && 'row-selected',
        approved && !selected && 'row-approved'
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

        {/* Approved Icon */}
        {approved && (
          <IconCheckCircle size={16} className="text-success flex-shrink-0" aria-label="Approved" />
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pl-14">
        <div className="text-xs text-muted-foreground">{match.cashTransaction.date}</div>

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
// TRANSACTION CARD COMPONENT
// =============================================================================

/**
 * Props for the TransactionCard component.
 */
interface TransactionCardProps {
  label: string
  icon: React.ReactNode
  tx: Transaction
  type: 'cash' | 'accrual'
}

/**
 * Transaction detail card in the match detail panel.
 *
 * Shows full transaction details including amount, description, date,
 * and category. Uses colored left border (green for cash, blue for accrual).
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
