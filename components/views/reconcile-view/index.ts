// Reconcile View Components - Barrel Export
export { ReconcileView } from '../reconcile-view'

// Subcomponents (for use within the view or testing)
export { MatchRow, type MatchRowProps } from './match-row'
export { SuspenseRow, type SuspenseRowProps } from './suspense-row'
export { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'
export { PartialMatchGroup, type PartialMatchGroupProps } from './partial-match-group'
export { SkeletonMatchRow } from './skeleton-match-row'
export { TabEmptyState, type TabEmptyStateProps } from './tab-empty-state'
export { HistoryList } from './history-list'

// State management hook
export { useReconcileState } from './use-reconcile-state'

// Types
export type {
  Tab,
  FilterState,
  UndoAction,
  MatchingResult,
  ReconcileState,
  ReconcileAction,
} from './types'
export { initialFilterState, initialReconcileState } from './types'
