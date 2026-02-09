'use client'

/**
 * Onboarding State Hook
 *
 * Manages the state for the onboarding tour and checklist.
 * Uses localStorage for persistence.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useSelectedCompanyId } from '@/lib/store'

const ONBOARDING_STORAGE_KEY = 'reconciled:onboarding'
const TOUR_SEEN_KEY = 'reconciled:tour-seen'

interface OnboardingState {
  /** Has the user seen the tour? */
  tourSeen: boolean
  /** Is the tour currently active? */
  tourActive: boolean
  /** Current step in the tour */
  tourStep: number
  /** Is the checklist visible? */
  checklistVisible: boolean
  /** Completed checklist items */
  completedItems: string[]
}

interface OnboardingActions {
  /** Start the onboarding tour */
  startTour: () => void
  /** Move to next tour step */
  nextStep: () => void
  /** Move to previous tour step */
  prevStep: () => void
  /** End the tour */
  endTour: () => void
  /** Toggle checklist visibility */
  toggleChecklist: () => void
  /** Mark a checklist item as complete */
  completeItem: (itemId: string) => void
  /** Reset onboarding state (for testing) */
  resetOnboarding: () => void
}

const defaultState: OnboardingState = {
  tourSeen: false,
  tourActive: false,
  tourStep: 0,
  checklistVisible: true,
  completedItems: [],
}

export function useOnboardingState(): OnboardingState & OnboardingActions {
  const { user, isAuthenticated } = useAuth()
  const selectedCompanyId = useSelectedCompanyId()
  const [state, setState] = useState<OnboardingState>(defaultState)
  const [isInitialized, setIsInitialized] = useState(false)

  const storageSuffix = `${user?.id ?? 'anon'}:${selectedCompanyId ?? 'none'}`
  const onboardingStorageKey = `${ONBOARDING_STORAGE_KEY}:${storageSuffix}`
  const tourSeenKey = `${TOUR_SEEN_KEY}:${storageSuffix}`

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsInitialized(false)

    const stored = localStorage.getItem(onboardingStorageKey)
    const tourSeen = localStorage.getItem(tourSeenKey) === 'true'

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setState({
          ...defaultState,
          ...parsed,
          tourSeen,
          // Don't restore active tour state (would be confusing on page reload)
          tourActive: false,
          tourStep: 0,
        })
      } catch (e) {
        console.error('Failed to parse onboarding state:', e)
      }
    } else if (!tourSeen) {
      // First time user - show checklist
      setState({
        ...defaultState,
        checklistVisible: true,
      })
    }

    setIsInitialized(true)
  }, [onboardingStorageKey, tourSeenKey])

  // Save state to localStorage on change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return

    localStorage.setItem(onboardingStorageKey, JSON.stringify({
      checklistVisible: state.checklistVisible,
      completedItems: state.completedItems,
    }))

    if (state.tourSeen) {
      localStorage.setItem(tourSeenKey, 'true')
    }
  }, [state, isInitialized, onboardingStorageKey, tourSeenKey])

  // Auto-start tour for new users
  useEffect(() => {
    if (!isInitialized) return

    // Only auto-start if user hasn't seen tour and is authenticated
    if (!state.tourSeen && isAuthenticated && !state.tourActive) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setState(s => ({ ...s, tourActive: true }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isInitialized, state.tourSeen, isAuthenticated, state.tourActive])

  const startTour = useCallback(() => {
    setState(s => ({
      ...s,
      tourActive: true,
      tourStep: 0,
    }))
  }, [])

  const nextStep = useCallback(() => {
    setState(s => ({
      ...s,
      tourStep: s.tourStep + 1,
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState(s => ({
      ...s,
      tourStep: Math.max(0, s.tourStep - 1),
    }))
  }, [])

  const endTour = useCallback(() => {
    setState(s => ({
      ...s,
      tourActive: false,
      tourSeen: true,
      tourStep: 0,
    }))
  }, [])

  const toggleChecklist = useCallback(() => {
    setState(s => ({
      ...s,
      checklistVisible: !s.checklistVisible,
    }))
  }, [])

  const completeItem = useCallback((itemId: string) => {
    setState(s => ({
      ...s,
      completedItems: s.completedItems.includes(itemId)
        ? s.completedItems
        : [...s.completedItems, itemId],
    }))
  }, [])

  const resetOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(onboardingStorageKey)
      localStorage.removeItem(tourSeenKey)
    }
    setState(defaultState)
  }, [onboardingStorageKey, tourSeenKey])

  return {
    ...state,
    startTour,
    nextStep,
    prevStep,
    endTour,
    toggleChecklist,
    completeItem,
    resetOnboarding,
  }
}
