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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useAppStore,
  useSelectedCompanyId,
  MatchPair,
  Transaction,
} from '@/lib/store'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useReconcileData } from '@/lib/use-reconcile-data'
import { useOptionalAuth } from '@/components/auth-provider'
import { Id } from '@/convex/_generated/dataModel'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import {
  IconWarningCircle,
  IconPlay,
  IconCheckCircle,
  IconFileText,
  IconCommand,
  IconDollarSign,
} from '@/components/brand/icons'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useToastHelpers } from '@/components/ui/toast'
import { useRunMatching } from '@/lib/convex-hooks'
import { cn } from '@/lib/utils'
import {
  MatchCelebration,
  MatchingStepIndicator,
  BrandedEmptyState,
  ButtonPrimary,
  ManualMatchModal,
} from '@/components/brand'
import { ReconcileAgent } from '@/components/ai'
import type { Tab, UndoAction, FilterState } from './reconcile-view/types'
import { initialFilterState } from './reconcile-view/types'
import { useReconcileState } from './reconcile-view/use-reconcile-state'
import { useMatchActions } from '@/hooks/useMatchActions'
import { MatchDetailPanel, MobileMatchDetailPanel } from './reconcile-view/match-detail-panel'
import { ReconcileFilterBar } from './reconcile-view/filter-bar'
import { MatchRow } from './reconcile-view/match-row'
import { SuspenseRow } from './reconcile-view/suspense-row'
import { KeyboardShortcutsModal } from './reconcile-view/keyboard-shortcuts-modal'
import { PartialMatchGroup } from './reconcile-view/partial-match-group'
import { SkeletonMatchRow } from './reconcile-view/skeleton-match-row'
import { TabEmptyState } from './reconcile-view/tab-empty-state'
import { HistoryList } from './reconcile-view/history-list'
import { AgentFindingsBanner } from './reconcile-view/agent-findings-banner'
import { useAgentFindingsForReconciliation, type AgentReconciliationContext } from '@/hooks/useAgentFindingsForReconciliation'

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
  const selectedCompanyId = useSelectedCompanyId()
  const auth = useOptionalAuth()
  const workosUserId = auth?.user?.workosId

  // Get session ID from URL params, or fall back to most recent session for company
  const urlSessionId = searchParams.get('sessionId')
  // Always query company sessions — used for fallback session selection AND stats
  const companySessions = useQuery(
    api.sessions.listByCompany,
    selectedCompanyId
      ? { companyId: selectedCompanyId as Id<'companies'>, workosUserId }
      : 'skip'
  )
  const convexSessionId = urlSessionId
    ? (urlSessionId as Id<'reconciliationSessions'>)
    : companySessions && companySessions.length > 0
      ? companySessions[0]._id
      : undefined

  // Find the current session in companySessions for stats (no extra query needed)
  const currentSessionData = convexSessionId && companySessions
    ? companySessions.find((s) => s._id === convexSessionId)
    : undefined

  // Live stats subscription — derives counts from actual DB state (not stale stored values)
  const sessionStats = useQuery(
    api.sessions.getWithStats,
    convexSessionId ? { id: convexSessionId, workosUserId } : 'skip'
  )

  // Documents for the current company — used for document summary in empty states
  const companyDocuments = useQuery(
    api.documents.listByCompany,
    selectedCompanyId ? { companyId: selectedCompanyId as Id<'companies'>, workosUserId } : 'skip'
  )

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
  } = useReconcileData(convexSessionId, workosUserId)

  // Agent findings context — shows upload agent analysis on the reconcile page
  const agentContext = useAgentFindingsForReconciliation(convexSessionId, workosUserId)
  const [agentBannerDismissed, setAgentBannerDismissed] = useState(false)

  // Actions from store (they operate on current mode's data)
  const { showCelebration, setShowCelebration } = useAppStore()
  const { guardAction } = useDemoGuard()

  // Use consolidated state hook instead of 12+ individual useState calls
  const {
    activeTab,
    selectedMatch,
    manualMatchItem,
    isRunningMatching,
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


  // Toast notifications (P0-4, P1-5)
  const toast = useToastHelpers()

  // Re-sync documents mutation
  const resyncDocuments = useMutation(api.sessions.resyncDocuments)
  const [isResyncing, setIsResyncing] = React.useState(false)

  const handleResync = useCallback(async () => {
    if (!selectedCompanyId || isResyncing) return
    setIsResyncing(true)
    try {
      const result = await resyncDocuments({
        companyId: selectedCompanyId as Id<'companies'>,
        sessionId: convexSessionId,
        workosUserId,
      })
      toast.success(
        `Synced ${result.linkedCash} cash + ${result.linkedAccrual} accrual items`
      )
      // If we got a new session, navigate to it
      if (!convexSessionId && result.sessionId) {
        router.push(`/reconcile?sessionId=${result.sessionId}`)
      }
    } catch (error) {
      toast.error('Failed to sync documents')
      console.error('[Reconcile] Resync failed:', error)
    } finally {
      setIsResyncing(false)
    }
  }, [selectedCompanyId, convexSessionId, isResyncing, resyncDocuments, toast, router, workosUserId])

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
    rawPendingMatches.filter((m) => m.confidence === 'high' && m.matchLayer !== 7),
    [rawPendingMatches]
  )
  const mediumConfidencePending = useMemo(() =>
    rawPendingMatches.filter((m) => (m.confidence === 'medium' || m.confidence === 'low') && m.matchLayer !== 7),
    [rawPendingMatches]
  )

  // Partial matches (Layer 7) - grouped by partialMatchGroupId
  const partialMatches = useMemo(() =>
    rawPendingMatches.filter((m) => m.matchLayer === 7),
    [rawPendingMatches]
  )

  // Group partial matches by their group ID for display
  const partialMatchGroups = useMemo(() => {
    const groups = new Map<string, MatchPair[]>()
    partialMatches.forEach((m) => {
      const groupId = (m as MatchPair & { partialMatchGroupId?: string }).partialMatchGroupId || m.id
      if (!groups.has(groupId)) groups.set(groupId, [])
      groups.get(groupId)!.push(m)
    })
    return Array.from(groups.values())
  }, [partialMatches])

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
      case 'partial': return partialMatches
      case 'matched': return approvedMatches
      default: return []
    }
  }, [pendingMatches, reviewMatches, partialMatches, approvedMatches])

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

  // Live counts from getWithStats (actual DB state, not stored session values)
  const cashCount = sessionStats?.stats?.cashTransactions ?? 0
  const accrualCount = sessionStats?.stats?.accrualTransactions ?? 0

  // Combined loading guard — true when we have a session ID but queries haven't resolved
  const isSessionLoading = !!convexSessionId && (companySessions === undefined || sessionStats === undefined)

  const sessionStatus = currentSessionData?.status

  // Empty state flag for Real mode with no data (and not loading)
  // NOTE: This must NOT cause an early return — hooks below must always execute.
  // Don't trap user in empty state when session is in "review" with items on either side
  const hasNoData =
    !isDemo && !dataIsLoading && !isSessionLoading &&
    matches.length === 0 && suspenseTransactions.length === 0 &&
    !(convexSessionId && sessionStatus === 'review' && (cashCount > 0 || accrualCount > 0))

  // Notify when new data arrives (Phase 2B)
  const prevCounts = useRef({ cash: 0, accrual: 0 })
  useEffect(() => {
    if (!sessionStats?.stats) return
    const { cashTransactions: cash, accrualTransactions: accrual } = sessionStats.stats
    const prev = prevCounts.current
    if ((prev.cash > 0 || prev.accrual > 0) && (cash > prev.cash || accrual > prev.accrual)) {
      toast.info('Session updated', `New documents linked. ${cash} cash, ${accrual} accrual items.`)
    }
    prevCounts.current = { cash, accrual }
  }, [sessionStats?.stats?.cashTransactions, sessionStats?.stats?.accrualTransactions, toast])

  // Helper to auto-advance to next match in the active tab's list
  const advanceToNextMatch = useCallback(() => {
    const activeList = getActiveList(activeTab)
    const currentIndex = selectedMatch
      ? activeList.findIndex((m) => m.id === selectedMatch.id)
      : -1
    const nextIndex = currentIndex + 1
    if (nextIndex < activeList.length) {
      setSelectedMatch(activeList[nextIndex])
    } else if (activeList.length > 0) {
      setSelectedMatch(activeList[0])
    } else {
      setSelectedMatch(null)
    }
  }, [activeTab, getActiveList, selectedMatch, setSelectedMatch])

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
          // Approve current match (works on pending and review tabs)
          if (match && !match.approved && (tab === 'pending' || tab === 'review')) {
            e.preventDefault()
            handleApprove(match.id)
          }
          break
        case 'r':
          // Reject current match (works on pending and review tabs)
          if (match && !match.approved && (tab === 'pending' || tab === 'review')) {
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
        toast.warning('No active session', 'Please select or create a reconciliation session first.')
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

          // P0-4: Surface LLM fallback notification to users
          if (result.usedMockLLM) {
            toast.warning(
              'AI matching unavailable',
              result.llmError
                ? `Using rule-based matching instead. Error: ${result.llmError.substring(0, 100)}`
                : 'Used rule-based heuristic matching instead of AI semantic analysis.'
            )
          }

          if (result.totalMatches > 0) {
            setShowCelebration(true)
            toast.success(
              'Matching complete',
              `Found ${result.totalMatches} matches across ${Object.keys(result.matchesByLayer).length} layers.`
            )
          } else {
            toast.info(
              'No new matches found',
              'All transactions may already be matched or no suitable matches exist.'
            )
          }
        } else if (result.error) {
          // P1-5: Show error states to users
          toast.error('Matching failed', result.error)
        }
      } catch (error) {
        // P1-5: Show error states to users (catch block)
        const message = error instanceof Error ? error.message : 'An unexpected error occurred'
        console.error('Matching failed:', error)
        toast.error('Matching failed', message)
      } finally {
        setRunningMatching(false)
      }
    },
    [guardAction, sessionId, runMatching, setShowCelebration, toast]
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
      case 'partial':
        return {
          icon: <IconDollarSign size={32} className="text-cyan-500/40" />,
          title: 'No partial matches',
          description: 'When a payment covers multiple invoices, they will appear here for review.',
          className: 'empty-state-partial',
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

  // Show loading spinner while session data resolves (not empty state)
  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <span className="text-muted-foreground">Loading session data...</span>
        </div>
      </div>
    )
  }

  // Render empty state if no data — placed AFTER all hooks to satisfy React rules
  if (hasNoData) {
    // Filter documents belonging to the current session (for document summary)
    const sessionDocuments = companyDocuments?.filter((d) =>
      d.extractionStatus === 'completed' || d.extractionStatus === 'processing'
    )

    // Document summary component (Phase 2A)
    const documentSummary = sessionDocuments && sessionDocuments.length > 0 ? (
      <div className="mt-4 text-sm text-muted-foreground space-y-1 text-left w-full max-w-sm mx-auto">
        <p className="font-medium">Documents uploaded:</p>
        {sessionDocuments.slice(0, 5).map((doc) => (
          <div key={doc._id} className="flex items-center gap-2">
            <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${
              doc.documentType === 'bank_statement' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
            }`}>
              {doc.documentType === 'bank_statement' ? 'Bank' : 'Invoice'}
            </span>
            <span className="truncate flex-1">{doc.fileName}</span>
            <span className={doc.extractionStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'}>
              {doc.extractionStatus === 'completed' ? 'Done' : 'Processing'}
            </span>
          </div>
        ))}
        {sessionDocuments.length > 5 && (
          <p className="text-xs">...and {sessionDocuments.length - 5} more</p>
        )}
      </div>
    ) : null

    if (convexSessionId && cashCount > 0 && accrualCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <BrandedEmptyState
            variant="reconcile"
            title={`${cashCount} bank transaction${cashCount !== 1 ? 's' : ''} loaded`}
            description="Upload invoices or receipts to start matching. Matching runs automatically once both sides are uploaded."
            action={{
              label: 'Upload Invoices',
              onClick: () => router.push('/upload'),
            }}
          />
          {documentSummary}
        </div>
      )
    }

    if (convexSessionId && cashCount === 0 && accrualCount > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <BrandedEmptyState
            variant="reconcile"
            title={`${accrualCount} invoice${accrualCount !== 1 ? 's' : ''} loaded`}
            description="Upload a bank statement to start matching, or re-sync if bank statements are already uploaded but not linked."
            action={{
              label: 'Upload Bank Statements',
              onClick: () => router.push('/upload'),
            }}
          />
          {selectedCompanyId && (
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="mt-3 px-4 py-2 text-sm text-muted-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isResyncing ? 'Syncing...' : 'Re-sync Documents'}
            </button>
          )}
          {documentSummary}
        </div>
      )
    }

    if (convexSessionId && cashCount > 0 && accrualCount > 0) {
      // Both sides exist but no matches yet
      if (sessionStatus === 'review') {
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <BrandedEmptyState
              variant="reconcile"
              title="No matches found"
              description={`${cashCount} cash and ${accrualCount} accrual items were compared but no matches were identified. Check that the documents are for the same period and company.`}
              action={{
                label: 'Run Matching Again',
                onClick: () => handleRunMatching(false),
              }}
            />
            {documentSummary}
          </div>
        )
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <BrandedEmptyState
            variant="reconcile"
            title={`${cashCount} cash + ${accrualCount} accrual items ready`}
            description="Matching should start automatically. If it hasn't, click below to run it manually."
            action={{
              label: 'Run Matching',
              onClick: () => handleRunMatching(false),
            }}
          />
          {documentSummary}
        </div>
      )
    }

    if (convexSessionId && cashCount === 0 && accrualCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <BrandedEmptyState
            variant="reconcile"
            title="Session is empty"
            description="No documents have been linked to this session yet. If you've uploaded documents, try re-syncing."
            action={{
              label: 'Upload Documents',
              onClick: () => router.push('/upload'),
            }}
          />
          {selectedCompanyId && (
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="mt-3 px-4 py-2 text-sm text-muted-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isResyncing ? 'Syncing...' : 'Re-sync Documents'}
            </button>
          )}
          {documentSummary}
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <BrandedEmptyState
          variant="reconcile"
          title="No reconciliation session"
          description="Upload documents to automatically create a session, or re-sync if documents are already uploaded."
          action={{
            label: 'Upload Documents',
            onClick: () => router.push('/upload'),
          }}
        />
        {selectedCompanyId && (
          <button
            onClick={handleResync}
            disabled={isResyncing}
            className="mt-3 px-4 py-2 text-sm text-muted-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isResyncing ? 'Syncing...' : 'Re-sync Documents'}
          </button>
        )}
      </div>
    )
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
          reviewMatchCount={reviewMatches.length}
          partialGroupCount={partialMatchGroups.length}
          suspenseCount={suspenseItems.length}
          onUpdateFilters={updateFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={clearFilters}
        />

        {/* Agent Findings Banner — shows pre-upload analysis context */}
        {agentContext.hasAgentContext && !agentBannerDismissed && agentContext.findingCounts.total > 0 && (
          <AgentFindingsBanner
            findings={agentContext.findings}
            summary={agentContext.agentSession?.summary}
            findingCounts={agentContext.findingCounts}
            highestSeverity={agentContext.highestSeverity}
            onDismiss={() => setAgentBannerDismissed(true)}
          />
        )}

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
          {(['pending', 'review', 'partial', 'matched', 'suspense'] as Tab[]).map((tab) => {
            // Tab labels and descriptions
            const tabConfig: Record<Tab, { label: string; description: string }> = {
              pending: { label: 'Ready', description: 'High confidence, ready to approve' },
              review: { label: 'Review', description: 'Medium confidence, needs careful review' },
              partial: { label: 'Partial', description: 'One-to-many payment matches' },
              matched: { label: 'Matched', description: 'Approved matches' },
              suspense: { label: 'Suspense', description: 'Unmatched items' },
            }
            const { label: tabLabel } = tabConfig[tab]
            const count =
              tab === 'pending'
                ? pendingMatches.length
                : tab === 'review'
                  ? reviewMatches.length
                  : tab === 'partial'
                    ? partialMatchGroups.length
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
          {(dataIsLoading) && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchRow key={i} />
              ))}
            </>
          )}

          {/* Pending Matches (High Confidence - Ready to Approve) */}
          {!(dataIsLoading) && activeTab === 'pending' && (
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
          {!(dataIsLoading) && activeTab === 'review' && (
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

          {/* Partial Matches (One-to-Many Payment Matches) */}
          {!(dataIsLoading) && activeTab === 'partial' && (
            <>
              {partialMatchGroups.length > 0 && (
                <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                  <IconDollarSign size={12} />
                  <span>Partial matches - one payment split across multiple invoices</span>
                </div>
              )}
              {partialMatchGroups.map((group, groupIndex) => (
                <PartialMatchGroup
                  key={group[0]?.id || groupIndex}
                  matches={group}
                  selected={selectedMatch ? group.some(m => m.id === selectedMatch.id) : false}
                  onSelectMatch={setSelectedMatch}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </>
          )}

          {/* Approved Matches — Approval History Timeline */}
          {!(dataIsLoading) && activeTab === 'matched' && approvedMatches.length > 0 && (
            <HistoryList
              matches={approvedMatches}
              onSelectMatch={setSelectedMatch}
              selectedMatchId={selectedMatch?.id}
            />
          )}

          {/* Suspense Items */}
          {!(dataIsLoading) && activeTab === 'suspense' && (
            <>
              {/* Agent findings relevant to suspense — explains why items may be unmatched */}
              <SuspenseAgentContext
                suspenseItems={suspenseItems}
                agentContext={agentContext}
              />
              {suspenseItems.map((item) => (
                <SuspenseRow key={item.id} item={item} onFindMatch={handleFindMatch} />
              ))}
            </>
          )}

          {/* Empty States */}
          {!(dataIsLoading) &&
            ((activeTab === 'pending' && pendingMatches.length === 0) ||
              (activeTab === 'review' && reviewMatches.length === 0) ||
              (activeTab === 'partial' && partialMatchGroups.length === 0) ||
              (activeTab === 'matched' && approvedMatches.length === 0) ||
              (activeTab === 'suspense' && suspenseItems.length === 0)) && (
              <TabEmptyState {...getTabEmptyState(activeTab)} />
            )}
        </div>

        {/* AI Reconciliation Assistant - Centered within this section */}
        {sessionId && (
          <ReconcileAgent
            className="assistant-container--in-reconcile"
            sessionId={sessionId}
            companyName={sessionName}
            agentSummary={agentContext.agentSession?.summary}
          />
        )}
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
      <KeyboardShortcutsModal isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

/** Finding types that are relevant to understanding why items landed in suspense */
const SUSPENSE_RELEVANT_TYPES = new Set([
  'extraction_errors',
  'low_confidence_extractions',
  'unusual_amounts',
  'duplicate_transactions',
  'orphaned_documents',
  'basis_inconsistency',
])

/**
 * Contextual strip for the suspense tab that shows relevant agent findings
 * which may explain why items could not be matched.
 */
function SuspenseAgentContext({
  suspenseItems,
  agentContext,
}: {
  suspenseItems: Transaction[]
  agentContext: AgentReconciliationContext
}) {
  const relevant = useMemo(
    () => agentContext.findings.filter((f) => SUSPENSE_RELEVANT_TYPES.has(f.type)),
    [agentContext.findings],
  )

  if (suspenseItems.length === 0 || !agentContext.hasAgentContext || relevant.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-2 bg-warning/5 border-b border-warning/20 text-xs text-muted-foreground flex items-start gap-2">
      <IconWarningCircle size={12} className="text-warning mt-0.5 shrink-0" />
      <div>
        <span className="font-medium text-warning">
          Agent found issues that may explain unmatched items:{' '}
        </span>
        {relevant.map((f, i) => (
          <span key={f._id}>
            {f.title}
            {i < relevant.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}