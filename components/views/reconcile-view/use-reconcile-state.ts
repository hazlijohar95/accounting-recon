import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { MatchPair, MatchConfidence } from '@/lib/store'
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

// ============================================================================
// URL Filter Persistence
// ============================================================================

const FILTER_PARAM_KEYS = {
  search: 'q',
  layers: 'layers',
  confidence: 'conf',
  minAmount: 'minAmt',
  maxAmount: 'maxAmt',
  dateFrom: 'from',
  dateTo: 'to',
  tab: 'tab',
} as const

/**
 * Parse filters from URL search params
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<FilterState> & { tab?: Tab } {
  const filters: Partial<FilterState> & { tab?: Tab } = {}

  // Search query
  const search = searchParams.get(FILTER_PARAM_KEYS.search)
  if (search) filters.searchQuery = search

  // Match layers (comma-separated numbers)
  const layers = searchParams.get(FILTER_PARAM_KEYS.layers)
  if (layers) {
    const parsed = layers.split(',').map(Number).filter(n => n >= 1 && n <= 7) as (1|2|3|4|5|6|7)[]
    if (parsed.length > 0) filters.matchLayers = parsed
  }

  // Confidence levels (comma-separated)
  const conf = searchParams.get(FILTER_PARAM_KEYS.confidence)
  if (conf) {
    const validLevels = ['high', 'medium', 'low'] as const
    const parsed = conf.split(',').filter(c => validLevels.includes(c as MatchConfidence)) as MatchConfidence[]
    if (parsed.length > 0) filters.confidenceLevels = parsed
  }

  // Amount range
  const minAmt = searchParams.get(FILTER_PARAM_KEYS.minAmount)
  if (minAmt) {
    const num = parseFloat(minAmt)
    if (!isNaN(num)) filters.minAmount = num
  }

  const maxAmt = searchParams.get(FILTER_PARAM_KEYS.maxAmount)
  if (maxAmt) {
    const num = parseFloat(maxAmt)
    if (!isNaN(num)) filters.maxAmount = num
  }

  // Date range
  const from = searchParams.get(FILTER_PARAM_KEYS.dateFrom)
  if (from) filters.dateFrom = from

  const to = searchParams.get(FILTER_PARAM_KEYS.dateTo)
  if (to) filters.dateTo = to

  // Tab
  const tab = searchParams.get(FILTER_PARAM_KEYS.tab)
  if (tab && ['pending', 'review', 'partial', 'matched', 'suspense'].includes(tab)) {
    filters.tab = tab as Tab
  }

  return filters
}

/**
 * Serialize filters to URL search params
 */
function serializeFiltersToUrl(
  filters: FilterState,
  tab: Tab,
  existingParams: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(existingParams)

  // Preserve sessionId if present
  const sessionId = params.get('sessionId')
  params.delete(FILTER_PARAM_KEYS.search)
  params.delete(FILTER_PARAM_KEYS.layers)
  params.delete(FILTER_PARAM_KEYS.confidence)
  params.delete(FILTER_PARAM_KEYS.minAmount)
  params.delete(FILTER_PARAM_KEYS.maxAmount)
  params.delete(FILTER_PARAM_KEYS.dateFrom)
  params.delete(FILTER_PARAM_KEYS.dateTo)
  params.delete(FILTER_PARAM_KEYS.tab)

  if (sessionId) {
    params.set('sessionId', sessionId)
  }

  // Add non-default values
  if (filters.searchQuery) {
    params.set(FILTER_PARAM_KEYS.search, filters.searchQuery)
  }

  if (filters.matchLayers.length > 0) {
    params.set(FILTER_PARAM_KEYS.layers, filters.matchLayers.join(','))
  }

  if (filters.confidenceLevels.length > 0) {
    params.set(FILTER_PARAM_KEYS.confidence, filters.confidenceLevels.join(','))
  }

  if (filters.minAmount !== null) {
    params.set(FILTER_PARAM_KEYS.minAmount, String(filters.minAmount))
  }

  if (filters.maxAmount !== null) {
    params.set(FILTER_PARAM_KEYS.maxAmount, String(filters.maxAmount))
  }

  if (filters.dateFrom) {
    params.set(FILTER_PARAM_KEYS.dateFrom, filters.dateFrom)
  }

  if (filters.dateTo) {
    params.set(FILTER_PARAM_KEYS.dateTo, filters.dateTo)
  }

  if (tab !== 'pending') {
    params.set(FILTER_PARAM_KEYS.tab, tab)
  }

  return params
}

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
 *
 * Includes URL persistence for filters, enabling shareable filtered views.
 */
export function useReconcileState() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse initial state from URL
  const urlFilters = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams])

  // Initialize with URL values merged into defaults
  const initialState = useMemo((): ReconcileState => {
    const { tab, ...filterValues } = urlFilters
    return {
      ...initialReconcileState,
      activeTab: tab || 'pending',
      filters: {
        ...initialFilterState,
        ...filterValues,
      },
    }
  }, []) // Only compute on mount

  const [state, dispatch] = useReducer(reconcileReducer, initialState)

  // Sync state to URL when filters or tab change (debounced to avoid excessive router.replace calls)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncToUrl = useCallback(
    (filters: FilterState, tab: Tab) => {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      // Debounce URL sync by 300ms to avoid hammering router on every keystroke
      syncTimeoutRef.current = setTimeout(() => {
        const params = serializeFiltersToUrl(filters, tab, searchParams)
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(newUrl, { scroll: false })
      }, 300)
    },
    [pathname, router, searchParams]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  // Keep a ref to current state to avoid stale closures in callbacks
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Action creators with URL sync (using refs to avoid stale closures)
  const setActiveTab = useCallback((tab: Tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
    syncToUrl(stateRef.current.filters, tab)
  }, [syncToUrl])

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
    const newFilters = { ...stateRef.current.filters, ...filters }
    syncToUrl(newFilters, stateRef.current.activeTab)
  }, [syncToUrl])

  const setShowFilters = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_FILTERS', payload: show })
  }, [])

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
    syncToUrl(initialFilterState, stateRef.current.activeTab)
  }, [syncToUrl])

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
