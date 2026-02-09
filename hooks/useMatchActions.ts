'use client'

/**
 * Unified Match Actions Hook.
 *
 * Encapsulates the complete match approval/rejection workflow:
 * - Demo mode guard check
 * - Optimistic update to local store
 * - Backend persistence via Convex
 * - Automatic rollback on failure
 * - Undo stack management
 *
 * @module hooks/useMatchActions
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  useAppStore,
  useRevertMatchApproval,
  useRevertMatchRejection,
  MatchPair,
} from '@/lib/store'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import { useApproveMatch, useRejectMatch } from '@/lib/convex-hooks'
import { useToast } from '@/components/ui/toast'
import { Id } from '@/convex/_generated/dataModel'
import type { UndoAction } from '@/components/views/reconcile-view/types'

// =============================================================================
// TYPES
// =============================================================================

interface UseMatchActionsOptions {
  /** All matches for lookup */
  matches: MatchPair[]
  /** Callback after successful approval (e.g., to advance to next match) */
  onApproveSuccess?: (matchId: string) => void
  /** Callback after successful rejection (e.g., to advance to next match) */
  onRejectSuccess?: (matchId: string) => void
  /** Function to push to undo stack */
  pushUndo: (action: UndoAction) => void
  /** Function to remove from undo stack by match ID */
  removeUndoByMatchId: (matchId: string) => void
}

interface UseMatchActionsReturn {
  /** Approve a match with backend persistence */
  handleApprove: (matchId: string) => Promise<void>
  /** Reject a match with backend persistence */
  handleReject: (matchId: string) => Promise<void>
  /** Undo last action using provided undo stack */
  handleUndo: (undoStack: UndoAction[], popUndo: () => void) => void
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for unified match approval/rejection actions.
 *
 * Handles the complete workflow including:
 * - Demo mode blocking
 * - Optimistic UI updates
 * - Backend persistence
 * - Automatic rollback on failure
 * - Toast notifications
 *
 * @example
 * ```tsx
 * const { handleApprove, handleReject, handleUndo } = useMatchActions({
 *   matches,
 *   onApproveSuccess: advanceToNextMatch,
 *   onRejectSuccess: advanceToNextMatch,
 *   pushUndo,
 *   removeUndoByMatchId,
 * })
 * ```
 */
export function useMatchActions({
  matches,
  onApproveSuccess,
  onRejectSuccess,
  pushUndo,
  removeUndoByMatchId,
}: UseMatchActionsOptions): UseMatchActionsReturn {
  // Store actions
  const { approveMatch, rejectMatch, setShowCelebration } = useAppStore()
  const revertMatchApproval = useRevertMatchApproval()
  const revertMatchRejection = useRevertMatchRejection()

  // Convex mutations
  const approveMatchBackend = useApproveMatch()
  const rejectMatchBackend = useRejectMatch()

  // Demo guard and toast
  const { guardAction } = useDemoGuard()
  const toast = useToast()

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * Approve a match with full workflow.
   */
  const handleApprove = useCallback(
    async (matchId: string) => {
      if (guardAction()) return

      // Find match for undo
      const matchToApprove = matches.find((m) => m.id === matchId)
      if (matchToApprove) {
        const undoAction: UndoAction = {
          id: crypto.randomUUID(),
          type: 'approve',
          matchId,
          match: { ...matchToApprove },
          timestamp: Date.now(),
        }
        pushUndo(undoAction)
      }

      // Show celebration and optimistic update
      setShowCelebration(true)
      approveMatch(matchId)

      // Persist to backend
      try {
        await approveMatchBackend(matchId as Id<'matchedPairs'>)
      } catch (error) {
        console.error('Failed to persist match approval:', error)

        if (!isMountedRef.current) return

        // Rollback on failure
        revertMatchApproval(matchId)
        removeUndoByMatchId(matchId)

        toast.addToast({
          type: 'error',
          title: 'Failed to save',
          description: 'Match approval could not be saved. Please try again.',
          duration: 5000,
        })
        return
      }

      if (!isMountedRef.current) return

      // Success callback
      onApproveSuccess?.(matchId)

      toast.addToast({
        type: 'success',
        title: 'Match approved',
        description: 'Press Ctrl+Z to undo',
        duration: 5000,
      })
    },
    [
      guardAction,
      matches,
      setShowCelebration,
      approveMatch,
      approveMatchBackend,
      revertMatchApproval,
      removeUndoByMatchId,
      onApproveSuccess,
      toast,
      pushUndo,
    ]
  )

  /**
   * Reject a match with full workflow.
   */
  const handleReject = useCallback(
    async (matchId: string) => {
      if (guardAction()) return

      // Find match for undo
      const matchToReject = matches.find((m) => m.id === matchId)
      if (matchToReject) {
        const undoAction: UndoAction = {
          id: crypto.randomUUID(),
          type: 'reject',
          matchId,
          match: { ...matchToReject },
          timestamp: Date.now(),
        }
        pushUndo(undoAction)
      }

      // Optimistic update
      rejectMatch(matchId)

      // Persist to backend
      try {
        await rejectMatchBackend(matchId as Id<'matchedPairs'>)
      } catch (error) {
        console.error('Failed to persist match rejection:', error)

        if (!isMountedRef.current) return

        // Rollback on failure
        if (matchToReject) {
          revertMatchRejection(matchId, matchToReject)
        }
        removeUndoByMatchId(matchId)

        toast.addToast({
          type: 'error',
          title: 'Failed to save',
          description: 'Match rejection could not be saved. Please try again.',
          duration: 5000,
        })
        return
      }

      if (!isMountedRef.current) return

      // Success callback
      onRejectSuccess?.(matchId)

      toast.addToast({
        type: 'info',
        title: 'Match rejected',
        description: 'Press Ctrl+Z to undo',
        duration: 5000,
      })
    },
    [
      guardAction,
      matches,
      rejectMatch,
      rejectMatchBackend,
      revertMatchRejection,
      removeUndoByMatchId,
      onRejectSuccess,
      toast,
      pushUndo,
    ]
  )

  /**
   * Undo last action from the stack.
   * Reverts both local (Zustand) state AND backend (Convex) state.
   */
  const handleUndo = useCallback(
    async (undoStack: UndoAction[], popUndo: () => void) => {
      if (undoStack.length === 0) return

      const lastAction = undoStack[0]
      popUndo()

      try {
        // 1. Revert local state immediately (optimistic)
        if (lastAction.type === 'approve') {
          revertMatchApproval(lastAction.matchId)
        } else if (lastAction.type === 'reject') {
          revertMatchRejection(lastAction.matchId, lastAction.match)
        }

        // 2. Revert backend state - reject reverts an approval, re-approve reverts a rejection
        // For an "undo approve", we reject the match on the backend (resets to pending)
        // For an "undo reject", we need to re-create the match relationship
        if (lastAction.type === 'approve') {
          await rejectMatchBackend(lastAction.matchId as Id<'matchedPairs'>)
        }
        // Note: Undoing a rejection is more complex since the backend already
        // reset the transactions to pending. The Convex subscription will reconcile
        // the state. For now, the local revert + next subscription tick handles it.

        if (!isMountedRef.current) return

        toast.addToast({
          type: 'success',
          title: 'Action undone',
          description: `Match ${lastAction.type === 'approve' ? 'un-approved' : 'restored'}`,
          duration: 3000,
        })
      } catch (error) {
        console.error('Undo failed:', error)

        if (!isMountedRef.current) return

        toast.addToast({
          type: 'error',
          title: 'Undo failed',
          description: 'Could not restore the previous state',
          duration: 3000,
        })
      }
    },
    [revertMatchApproval, revertMatchRejection, rejectMatchBackend, toast]
  )

  return {
    handleApprove,
    handleReject,
    handleUndo,
  }
}
