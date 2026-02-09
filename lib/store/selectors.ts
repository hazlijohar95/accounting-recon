/**
 * Typed selectors for the application store.
 *
 * These selectors prevent unnecessary re-renders by subscribing to specific
 * state slices instead of the entire store. Always prefer these over
 * direct useAppStore() calls.
 *
 * @module lib/store/selectors
 */

import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from './create-store'

// =============================================================================
// INDIVIDUAL SELECTORS
// =============================================================================

/** Returns whether the app is in demo mode */
export const useIsDemo = () => useAppStore((state) => state.isDemo)

export const useCashTransactions = () => useAppStore((state) => state.cashTransactions)
export const useAccrualTransactions = () => useAppStore((state) => state.accrualTransactions)
export const useAddTransactions = () => useAppStore((state) => state.addTransactions)

export const useMatches = () => useAppStore((state) => state.matches)
export const useApproveMatch = () => useAppStore((state) => state.approveMatch)
export const useRejectMatch = () => useAppStore((state) => state.rejectMatch)
export const useRevertMatchApproval = () => useAppStore((state) => state.revertMatchApproval)
export const useRevertMatchRejection = () => useAppStore((state) => state.revertMatchRejection)
export const useCreateManualMatch = () => useAppStore((state) => state.createManualMatch)

export const useAccrualDocuments = () => useAppStore((state) => state.accrualDocuments)
export const useSuspenseItems = () => useAppStore((state) => state.suspenseItems)

export const useSessions = () => useAppStore((state) => state.sessions)
export const useActiveSession = () => useAppStore((state) => state.activeSession)
export const useCreateSession = () => useAppStore((state) => state.createSession)

export const useIsProcessing = () => useAppStore((state) => state.isProcessing)
export const useProcessingProgress = () => useAppStore((state) => state.processingProgress)
export const useStartProcessing = () => useAppStore((state) => state.startProcessing)

export const useShowPaywall = () => useAppStore((state) => state.showPaywall)
export const useSetShowPaywall = () => useAppStore((state) => state.setShowPaywall)

export const useShowOnboarding = () => useAppStore((state) => state.showOnboarding)
export const useSetShowOnboarding = () => useAppStore((state) => state.setShowOnboarding)
export const useOnboardingData = () => useAppStore((state) => state.onboardingData)
export const useSetOnboardingData = () => useAppStore((state) => state.setOnboardingData)

// =============================================================================
// COMPOSITE SELECTORS
// =============================================================================

/** Combined onboarding state and setters */
export const useOnboardingState = () => useAppStore(
  useShallow((state) => ({
    showOnboarding: state.showOnboarding,
    setShowOnboarding: state.setShowOnboarding,
    onboardingData: state.onboardingData,
    setOnboardingData: state.setOnboardingData,
  }))
)

export const useUploadState = () => useAppStore(
  useShallow((state) => ({
    setShowPaywall: state.setShowPaywall,
    isDemo: state.isDemo,
  }))
)

// =============================================================================
// LOOKUP SELECTORS
// =============================================================================

/** Find a transaction by ID from either cash or accrual transactions */
export const useTransactionById = (id: string) => useAppStore((state) => {
  const cash = state.cashTransactions.find(t => t.id === id)
  if (cash) return cash
  return state.accrualTransactions.find(t => t.id === id)
})

export const useMatchById = (id: string) => useAppStore(
  (state) => state.matches.find(m => m.id === id)
)

// Celebration selector
export const useShowCelebration = () => useAppStore((state) => state.showCelebration)
export const useSetShowCelebration = () => useAppStore((state) => state.setShowCelebration)

// Mode toggle selectors
export const useToggleMode = () => useAppStore((state) => state.toggleMode)
export const useClearRealData = () => useAppStore((state) => state.clearRealData)
export const useHasRealData = () => useAppStore((state) =>
  state.realCashTransactions.length > 0 ||
  state.realAccrualTransactions.length > 0 ||
  state.realMatches.length > 0 ||
  state.realSessions.length > 0
)

// User & Company selectors
export const useCurrentUser = () => useAppStore((state) => state.currentUser)
export const useSetCurrentUser = () => useAppStore((state) => state.setCurrentUser)
export const useSelectedCompanyId = () => useAppStore((state) => state.selectedCompanyId)
export const useSetSelectedCompanyId = () => useAppStore((state) => state.setSelectedCompanyId)
export const useCompanies = () => useAppStore((state) => state.companies)
export const useSetCompanies = () => useAppStore((state) => state.setCompanies)

// Composite selector for company state
export const useCompanyState = () => useAppStore(
  useShallow((state) => ({
    selectedCompanyId: state.selectedCompanyId,
    setSelectedCompanyId: state.setSelectedCompanyId,
    companies: state.companies,
    setCompanies: state.setCompanies,
  }))
)

// Workspace selectors
export const useSelectedWorkspaceId = () => useAppStore((state) => state.selectedWorkspaceId)
export const useSetSelectedWorkspaceId = () => useAppStore((state) => state.setSelectedWorkspaceId)

// Composite selector for workspace state
export const useWorkspaceState = () => useAppStore(
  useShallow((state) => ({
    selectedWorkspaceId: state.selectedWorkspaceId,
    setSelectedWorkspaceId: state.setSelectedWorkspaceId,
  }))
)

// Sidebar selectors
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed)
export const useSetSidebarCollapsed = () => useAppStore((state) => state.setSidebarCollapsed)
export const useToggleSidebar = () => useAppStore((state) => state.toggleSidebar)

// AI Assistant selectors
export const useAssistantOpen = () => useAppStore((state) => state.assistantOpen)
export const useSetAssistantOpen = () => useAppStore((state) => state.setAssistantOpen)
export const useShowReasoningOverlay = () => useAppStore((state) => state.showReasoningOverlay)
export const useSetShowReasoningOverlay = () => useAppStore((state) => state.setShowReasoningOverlay)

// Processing documents selectors
export const useProcessingDocumentsCount = () => useAppStore((state) => state.processingDocumentsCount)
export const useSetProcessingDocumentsCount = () => useAppStore((state) => state.setProcessingDocumentsCount)

// =============================================================================
// DEMO WORKSPACE SELECTORS
// =============================================================================

export const useDemoWorkspaces = () => useAppStore((state) => state.demoWorkspaces)
export const useDemoWorksheets = () => useAppStore((state) => state.demoWorksheets)
export const useDemoColumns = () => useAppStore((state) => state.demoColumns)
export const useDemoRows = () => useAppStore((state) => state.demoRows)
export const useGuardAction = () => useAppStore((state) => state.guardAction)

// Composite selector for demo workspace data
export const useDemoWorkspaceData = () => useAppStore(
  useShallow((state) => ({
    workspaces: state.demoWorkspaces,
    worksheets: state.demoWorksheets,
    columns: state.demoColumns,
    rows: state.demoRows,
    guardAction: state.guardAction,
  }))
)

// =============================================================================
// MODE-AWARE SELECTORS
// =============================================================================
// Re-export mode-aware safe hooks from convex-hooks.ts
export {
  useCashTransactionsSafe,
  useAccrualDocumentsSafe,
  useSuspenseItemsSafe,
  useMatchesSafe,
  useSessionsSafe,
  useActiveSessionSafe,
} from "../convex-hooks";

/** Returns accrual transactions - demo data in Demo mode, real data in Real mode */
export const useAccrualTransactionsSafe = () => useAppStore((state) =>
  state.isDemo ? state.accrualTransactions : state.realAccrualTransactions
)

// =============================================================================
// DOMAIN-GROUPED SELECTORS
// =============================================================================

/**
 * Combined reconciliation state and actions.
 */
export const useReconciliationState = () => useAppStore(
  useShallow((state) => ({
    matches: state.matches,
    approveMatch: state.approveMatch,
    rejectMatch: state.rejectMatch,
    revertMatchApproval: state.revertMatchApproval,
    revertMatchRejection: state.revertMatchRejection,
    createManualMatch: state.createManualMatch,
    showCelebration: state.showCelebration,
    setShowCelebration: state.setShowCelebration,
  }))
)

/**
 * Combined session management state and actions.
 */
export const useSessionManagement = () => useAppStore(
  useShallow((state) => ({
    sessions: state.sessions,
    activeSession: state.activeSession,
    createSession: state.createSession,
    isProcessing: state.isProcessing,
    processingProgress: state.processingProgress,
    startProcessing: state.startProcessing,
  }))
)

/**
 * Combined transaction data for reconciliation views.
 */
export const useTransactionData = () => useAppStore(
  useShallow((state) => ({
    cashTransactions: state.cashTransactions,
    accrualTransactions: state.accrualTransactions,
    accrualDocuments: state.accrualDocuments,
    suspenseItems: state.suspenseItems,
    addTransactions: state.addTransactions,
  }))
)

/**
 * Combined UI state for modals and overlays.
 */
export const useUIState = () => useAppStore(
  useShallow((state) => ({
    showPaywall: state.showPaywall,
    setShowPaywall: state.setShowPaywall,
    assistantOpen: state.assistantOpen,
    setAssistantOpen: state.setAssistantOpen,
    showReasoningOverlay: state.showReasoningOverlay,
    setShowReasoningOverlay: state.setShowReasoningOverlay,
  }))
)
