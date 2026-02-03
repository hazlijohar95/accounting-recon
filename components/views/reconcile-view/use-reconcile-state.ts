import { useReducer, useCallback, useMemo } from 'react'
import type { MatchPair } from '@/lib/store'
import {
  ReconcileState,
  ReconcileAction,
  initialReconcileState,
  Tab,
  FilterState,
  UndoAction,
  MatchingResult,
  initialFilterState,
} from './types'

const MAX_UNDO_STACK = 10

/**
 * Reducer for reconcile view state management
 */
function reconcileReducer(state: ReconcileState, action: ReconcileAction): ReconcileState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload, selectedMatch: null }
    case 'SET_SELECTED_MATCH':
      return { ...state, selectedMatch: action.payload }
    case 'SET_MANUAL_MATCH_ITEM':
      return { ...state, manualMatchItem: action.payload }
    case 'SET_RUNNING_MATCHING':
      return { ...state, isRunningMatching: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_MATCHING_RESULT':
      return { ...state, matchingResult: action.payload }
    case 'SET_SHOW_REASONING_OVERLAY':
      return { ...state, showReasoningOverlay: action.payload }
    case 'SET_SHOW_KEYBOARD_HELP':
      return { ...state, showKeyboardHelp: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload }
    case 'CLEAR_FILTERS':
      return { ...state, filters: initialFilterState }
    case 'PUSH_UNDO':
      return {
        ...state,
        undoStack: [action.payload, ...state.undoStack].slice(0, MAX_UNDO_STACK),
      }
    case 'POP_UNDO':
      return { ...state, undoStack: state.undoStack.slice(1) }
    case 'REMOVE_UNDO_BY_MATCH_ID':
      return { ...state, undoStack: state.undoStack.filter((a) => a.matchId !== action.payload) }
    default:
      return state
  }
}

/**
 * Hook for managing reconcile view state with useReducer
 *
 * Consolidates 12+ useState calls into a single reducer for better
 * state management and debugging.
 */
export function useReconcileState() {
  const [state, dispatch] = useReducer(reconcileReducer, initialReconcileState)

  // Action creators
  const setActiveTab = useCallback((tab: Tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
  }, [])

  const setSelectedMatch = useCallback((match: MatchPair | null) => {
    dispatch({ type: 'SET_SELECTED_MATCH', payload: match })
  }, [])

  const setManualMatchItem = useCallback((item: import('@/lib/store').Transaction | null) => {
    dispatch({ type: 'SET_MANUAL_MATCH_ITEM', payload: item })
  }, [])

  const setRunningMatching = useCallback((running: boolean) => {
    dispatch({ type: 'SET_RUNNING_MATCHING', payload: running })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setMatchingResult = useCallback((result: MatchingResult | null) => {
    dispatch({ type: 'SET_MATCHING_RESULT', payload: result })
  }, [])

  const setShowReasoningOverlay = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_REASONING_OVERLAY', payload: show })
  }, [])

  const setShowKeyboardHelp = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_KEYBOARD_HELP', payload: show })
  }, [])

  const updateFilters = useCallback((filters: Partial<FilterState>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [])

  const setShowFilters = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_FILTERS', payload: show })
  }, [])

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [])

  const pushUndo = useCallback((action: UndoAction) => {
    dispatch({ type: 'PUSH_UNDO', payload: action })
  }, [])

  const popUndo = useCallback(() => {
    dispatch({ type: 'POP_UNDO' })
  }, [])

  const removeUndoByMatchId = useCallback((matchId: string) => {
    dispatch({ type: 'REMOVE_UNDO_BY_MATCH_ID', payload: matchId })
  }, [])

  // Memoized filter check
  const hasActiveFilters = useMemo(() => {
    const { filters } = state
    return (
      filters.searchQuery !== '' ||
      filters.matchLayers.length > 0 ||
      filters.confidenceLevels.length > 0 ||
      filters.minAmount !== null ||
      filters.maxAmount !== null ||
      filters.dateFrom !== null ||
      filters.dateTo !== null
    )
  }, [state.filters])

  return {
    // State
    ...state,

    // Derived state
    hasActiveFilters,

    // Actions
    setActiveTab,
    setSelectedMatch,
    setManualMatchItem,
    setRunningMatching,
    setLoading,
    setMatchingResult,
    setShowReasoningOverlay,
    setShowKeyboardHelp,
    updateFilters,
    setShowFilters,
    clearFilters,
    pushUndo,
    popUndo,
    removeUndoByMatchId,
  }
}
