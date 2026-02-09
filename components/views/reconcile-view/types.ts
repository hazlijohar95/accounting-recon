import type { MatchPair, Transaction, MatchConfidence } from '@/lib/store'

/** Tab options for the reconcile view */
export type Tab = 'pending' | 'review' | 'partial' | 'matched' | 'suspense'

/** Undo action type for tracking reversible actions */
export interface UndoAction {
  id: string
  type: 'approve' | 'reject'
  matchId: string
  match: MatchPair
  timestamp: number
}

/** Filter state type */
export interface FilterState {
  searchQuery: string
  matchLayers: (1 | 2 | 3 | 4 | 5 | 6 | 7)[]
  confidenceLevels: MatchConfidence[]
  minAmount: number | null
  maxAmount: number | null
  dateFrom: string | null
  dateTo: string | null
}

/** Initial filter state */
export const initialFilterState: FilterState = {
  searchQuery: '',
  matchLayers: [],
  confidenceLevels: [],
  minAmount: null,
  maxAmount: null,
  dateFrom: null,
  dateTo: null,
}

/** Matching result from the engine */
export interface MatchingResult {
  totalMatches: number
  matchesByLayer: Record<number, number>
  suspenseItems: number
}

/** State for the reconcile view reducer */
export interface ReconcileState {
  activeTab: Tab
  selectedMatch: MatchPair | null
  manualMatchItem: Transaction | null
  isRunningMatching: boolean
  isLoading: boolean
  matchingResult: MatchingResult | null
  /** Reserved for future use: AI reasoning overlay in match detail panel */
  showReasoningOverlay: boolean
  showKeyboardHelp: boolean
  filters: FilterState
  showFilters: boolean
  undoStack: UndoAction[]
}

/** Initial state for the reconcile view */
export const initialReconcileState: ReconcileState = {
  activeTab: 'pending',
  selectedMatch: null,
  manualMatchItem: null,
  isRunningMatching: false,
  isLoading: false,
  matchingResult: null,
  /** Reserved for future use: AI reasoning overlay in match detail panel */
  showReasoningOverlay: false,
  showKeyboardHelp: false,
  filters: initialFilterState,
  showFilters: false,
  undoStack: [],
}

/** Action types for the reconcile reducer */
export type ReconcileAction =
  | { type: 'SET_ACTIVE_TAB'; payload: Tab }
  | { type: 'SET_SELECTED_MATCH'; payload: MatchPair | null }
  | { type: 'SET_MANUAL_MATCH_ITEM'; payload: Transaction | null }
  | { type: 'SET_RUNNING_MATCHING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MATCHING_RESULT'; payload: MatchingResult | null }
  | { type: 'SET_SHOW_REASONING_OVERLAY'; payload: boolean }
  | { type: 'SET_SHOW_KEYBOARD_HELP'; payload: boolean }
  | { type: 'SET_FILTERS'; payload: Partial<FilterState> }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'PUSH_UNDO'; payload: UndoAction }
  | { type: 'POP_UNDO' }
  | { type: 'REMOVE_UNDO_BY_MATCH_ID'; payload: string }
