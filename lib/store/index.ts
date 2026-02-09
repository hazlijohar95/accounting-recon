// Store - Barrel Export
// Types
export type {
  DemoWorkspace,
  DemoWorksheet,
  DemoWorksheetColumn,
  DemoWorksheetRow,
  AuthUser,
  Company,
  TransactionStatus,
  MatchConfidence,
  Transaction,
  MatchPair,
  AccrualDocType,
  AccrualDocStatus,
  AccrualDocument,
  SuspenseStatus,
  SuspenseItem,
  ReconciliationSession,
  AppState,
} from './types'

// Demo data
export { demoCredits } from './demo-data'

// Store instance
export { useAppStore } from './create-store'

// All selectors
export {
  // Individual selectors
  useIsDemo,
  useCashTransactions,
  useAccrualTransactions,
  useAddTransactions,
  useMatches,
  useApproveMatch,
  useRejectMatch,
  useRevertMatchApproval,
  useRevertMatchRejection,
  useCreateManualMatch,
  useAccrualDocuments,
  useSuspenseItems,
  useSessions,
  useActiveSession,
  useCreateSession,
  useIsProcessing,
  useProcessingProgress,
  useStartProcessing,
  useShowPaywall,
  useSetShowPaywall,
  useShowOnboarding,
  useSetShowOnboarding,
  useOnboardingData,
  useSetOnboardingData,
  // Composite selectors
  useOnboardingState,
  useUploadState,
  // Lookup selectors
  useTransactionById,
  useMatchById,
  // Celebration
  useShowCelebration,
  useSetShowCelebration,
  // Mode toggle
  useToggleMode,
  useClearRealData,
  useHasRealData,
  // User & Company
  useCurrentUser,
  useSetCurrentUser,
  useSelectedCompanyId,
  useSetSelectedCompanyId,
  useCompanies,
  useSetCompanies,
  useCompanyState,
  // Workspace
  useSelectedWorkspaceId,
  useSetSelectedWorkspaceId,
  useWorkspaceState,
  // Sidebar
  useSidebarCollapsed,
  useSetSidebarCollapsed,
  useToggleSidebar,
  // AI Assistant
  useAssistantOpen,
  useSetAssistantOpen,
  useShowReasoningOverlay,
  useSetShowReasoningOverlay,
  // Processing
  useProcessingDocumentsCount,
  useSetProcessingDocumentsCount,
  // Demo workspace
  useDemoWorkspaces,
  useDemoWorksheets,
  useDemoColumns,
  useDemoRows,
  useGuardAction,
  useDemoWorkspaceData,
  // Mode-aware selectors
  useCashTransactionsSafe,
  useAccrualDocumentsSafe,
  useSuspenseItemsSafe,
  useMatchesSafe,
  useSessionsSafe,
  useActiveSessionSafe,
  useAccrualTransactionsSafe,
  // Domain-grouped selectors
  useReconciliationState,
  useSessionManagement,
  useTransactionData,
  useUIState,
} from './selectors'
