'use client'

import { useCallback } from 'react'
import { useIsDemo, useSetShowPaywall } from '@/lib/store'

// Development bypass for testing without paywall
// Only enabled in development mode AND when explicitly set
const BYPASS_PAYWALL =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_BYPASS_PAYWALL === 'true'

interface UseDemoGuardReturn {
  /** Whether the app is in demo mode */
  isDemo: boolean
  /**
   * Guard function that shows paywall if in demo mode.
   * Returns true if blocked (user is in demo mode), false if action should proceed.
   *
   * @param onBlocked Optional callback to run when action is blocked
   * @returns true if action was blocked, false if action can proceed
   */
  guardAction: (onBlocked?: () => void) => boolean
  /**
   * Execute an action only if not in demo mode.
   * Shows paywall and optionally runs onBlocked callback if in demo mode.
   *
   * @param action The action to execute if not in demo mode
   * @param onBlocked Optional callback to run when action is blocked
   */
  executeIfAllowed: (action: () => void, onBlocked?: () => void) => void
}

/**
 * Hook for guarding actions against demo mode.
 * When the user attempts a paid action in demo mode, this shows the paywall.
 *
 * @example
 * ```tsx
 * function UploadButton() {
 *   const { isDemo, guardAction } = useDemoGuard()
 *
 *   const handleUpload = () => {
 *     if (guardAction()) return // Shows paywall and exits if in demo mode
 *     // Proceed with upload...
 *   }
 *
 *   return (
 *     <Button onClick={handleUpload} disabled={isDemo}>
 *       Upload
 *       {isDemo && <Badge>Pro</Badge>}
 *     </Button>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ReconcileActions() {
 *   const { executeIfAllowed } = useDemoGuard()
 *
 *   const handleApprove = (matchId: string) => {
 *     executeIfAllowed(() => {
 *       approveMatch(matchId)
 *       showCelebration()
 *     })
 *   }
 *
 *   return <Button onClick={() => handleApprove(id)}>Approve</Button>
 * }
 * ```
 */
export function useDemoGuard(): UseDemoGuardReturn {
  const isDemo = useIsDemo()
  const setShowPaywall = useSetShowPaywall()

  const guardAction = useCallback(
    (onBlocked?: () => void): boolean => {
      if (BYPASS_PAYWALL) return false // Never block in bypass mode
      if (isDemo) {
        setShowPaywall(true)
        onBlocked?.()
        return true
      }
      return false
    },
    [isDemo, setShowPaywall]
  )

  const executeIfAllowed = useCallback(
    (action: () => void, onBlocked?: () => void): void => {
      if (BYPASS_PAYWALL) {
        action()
        return
      }
      if (isDemo) {
        setShowPaywall(true)
        onBlocked?.()
        return
      }
      action()
    },
    [isDemo, setShowPaywall]
  )

  return { isDemo, guardAction, executeIfAllowed }
}
