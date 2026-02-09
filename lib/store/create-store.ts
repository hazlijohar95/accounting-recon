/**
 * Zustand store creation with persist middleware.
 *
 * @module lib/store/create-store
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState,
  TransactionStatus,
  AccrualDocStatus,
  Transaction,
  MatchPair,
  ReconciliationSession,
} from './types'
import { demoData, demoWorkspaceData, initDemoData } from './demo-data'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  isDemo: true,

  cashTransactions: demoData.cash,
  accrualTransactions: demoData.accrual,
  addTransactions: (transactions, type) => set((state) => ({
    cashTransactions: type === 'cash' ? [...state.cashTransactions, ...transactions] : state.cashTransactions,
    accrualTransactions: type === 'accrual' ? [...state.accrualTransactions, ...transactions] : state.accrualTransactions,
  })),

  accrualDocuments: demoData.accrualDocuments,
  suspenseItems: demoData.suspenseItems,

  matches: demoData.matches,
  approveMatch: (matchId) => set((state) => ({
    matches: state.matches.map(m => m.id === matchId ? { ...m, approved: true, status: 'approved' as const, reviewedAt: Date.now() } : m)
  })),
  rejectMatch: (matchId) => set((state) => ({
    matches: state.matches.filter(m => m.id !== matchId)
  })),
  revertMatchApproval: (matchId) => set((state) => ({
    matches: state.matches.map(m => m.id === matchId ? { ...m, approved: false, status: 'pending' as const, reviewedAt: undefined } : m)
  })),
  revertMatchRejection: (matchId, match) => set((state) => {
    // Only add back if not already present (prevents duplicates)
    const exists = state.matches.some(m => m.id === matchId)
    if (exists) return state
    return { matches: [...state.matches, match] }
  }),
  createManualMatch: (cashTxId, accrualDocId, confidence) => set((state) => {
    // Find the cash transaction
    const cashTx = state.cashTransactions.find(t => t.id === cashTxId)
    if (!cashTx) return state

    // Find the accrual document
    const accrualDoc = state.accrualDocuments.find(d => d.id === accrualDocId)
    if (!accrualDoc) return state

    // Create synthetic accrual transaction from accrual doc
    const accrualTx: Transaction = {
      id: `atx-${accrualDocId}`,
      date: accrualDoc.docDate,
      description: accrualDoc.description || `${accrualDoc.docNumber} - ${accrualDoc.counterparty || 'Unknown'}`,
      amount: accrualDoc.amount,
      type: 'accrual',
      status: 'matched',
      category: accrualDoc.docType,
    }

    // Generate new match ID
    const matchId = `m-manual-${Date.now()}`

    // Create the match pair
    const newMatch: MatchPair = {
      id: matchId,
      cashTransaction: { ...cashTx, status: 'matched', matchId },
      accrualTransaction: accrualTx,
      accrualDocument: { ...accrualDoc, status: 'matched', matchId },
      confidence,
      matchLayer: 6, // Manual match
      approved: false, // Goes to pending for review
    }

    // Update transactions and documents status
    const updatedCashTransactions = state.cashTransactions.map(t =>
      t.id === cashTxId ? { ...t, status: 'matched' as TransactionStatus, matchId, confidence } : t
    )

    const updatedAccrualDocuments = state.accrualDocuments.map(d =>
      d.id === accrualDocId ? { ...d, status: 'matched' as AccrualDocStatus, matchId } : d
    )

    // Remove from suspense items if present
    const updatedSuspenseItems = state.suspenseItems.filter(s => s.sourceId !== cashTxId)

    return {
      matches: [...state.matches, newMatch],
      cashTransactions: updatedCashTransactions,
      accrualDocuments: updatedAccrualDocuments,
      suspenseItems: updatedSuspenseItems,
    }
  }),

  sessions: [demoData.session],
  activeSession: demoData.session,
  createSession: (name) => set((state) => {
    const newSession: ReconciliationSession = {
      id: `s${Date.now()}`,
      name,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'processing',
      progress: 0,
      totalCash: state.cashTransactions.length,
      totalAccrual: state.accrualTransactions.length,
      matchedCount: 0,
      suspenseCount: 0,
    }
    return { sessions: [...state.sessions, newSession], activeSession: newSession }
  }),

  isProcessing: false,
  processingProgress: 0,
  startProcessing: () => set({ isProcessing: true, processingProgress: 0 }),

  showPaywall: false,
  setShowPaywall: (show) => set({ showPaywall: show }),

  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  onboardingData: {},
  setOnboardingData: (data) => set((state) => ({
    onboardingData: { ...state.onboardingData, ...data }
  })),

  showCelebration: false,
  setShowCelebration: (show) => set({ showCelebration: show }),

  // Real mode data storage - initialized as empty
  realCashTransactions: [],
  realAccrualTransactions: [],
  realMatches: [],
  realSessions: [],
  realActiveSession: null,

  // Toggle between demo and real mode
  toggleMode: () => set((state) => {
    console.log('[Store] toggleMode called, current isDemo:', state.isDemo)
    if (state.isDemo) {
      // Switching to Real mode - swap to real data
      console.log('[Store] Switching from Demo to Real mode')
      return {
        isDemo: false,
        cashTransactions: state.realCashTransactions,
        accrualTransactions: state.realAccrualTransactions,
        accrualDocuments: [],
        suspenseItems: [],
        matches: state.realMatches,
        sessions: state.realSessions,
        activeSession: state.realActiveSession,
      }
    } else {
      // Switching to Demo mode - save real data, load demo
      console.log('[Store] Switching from Real to Demo mode')
      const demo = initDemoData()
      return {
        isDemo: true,
        // Clear company selection (demo mode doesn't use companies)
        selectedCompanyId: null,
        // Save current real data
        realCashTransactions: state.cashTransactions,
        realAccrualTransactions: state.accrualTransactions,
        realMatches: state.matches,
        realSessions: state.sessions,
        realActiveSession: state.activeSession,
        // Load demo data
        cashTransactions: demo.cash,
        accrualTransactions: demo.accrual,
        accrualDocuments: demo.accrualDocuments,
        suspenseItems: demo.suspenseItems,
        matches: demo.matches,
        sessions: [demo.session],
        activeSession: demo.session,
      }
    }
  }),

  // Clear real mode data
  clearRealData: () => set({
    realCashTransactions: [],
    realAccrualTransactions: [],
    realMatches: [],
    realSessions: [],
    realActiveSession: null,
    // Also clear current data if in real mode
    ...(get().isDemo ? {} : {
      cashTransactions: [],
      accrualTransactions: [],
      matches: [],
      sessions: [],
      activeSession: null,
    }),
  }),

  // User & Company state
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
  companies: [],
  setCompanies: (companies) => set({ companies }),

  // Workspace selection (for spreadsheet import feature)
  selectedWorkspaceId: null,
  setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),

  // Sidebar state
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // AI Assistant state
  assistantOpen: false,
  setAssistantOpen: (open) => set({ assistantOpen: open }),
  showReasoningOverlay: false,
  setShowReasoningOverlay: (show) => set({ showReasoningOverlay: show }),

  // Processing count for sidebar badge
  processingDocumentsCount: 0,
  setProcessingDocumentsCount: (count) => set({ processingDocumentsCount: count }),

  // Demo workspace data
  demoWorkspaces: demoWorkspaceData.workspaces,
  demoWorksheets: demoWorkspaceData.worksheets,
  demoColumns: demoWorkspaceData.columns,
  demoRows: demoWorkspaceData.rows,

  // Guard action helper - shows paywall and returns true if should block
  guardAction: () => {
    const state = get()
    if (state.isDemo) {
      state.setShowPaywall(true)
      return true
    }
    return false
  },
}),
    {
      name: 'reconciled-sidebar',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        isDemo: state.isDemo,
        selectedCompanyId: state.selectedCompanyId,
      }),
      onRehydrateStorage: () => (state) => {
        // After hydration, if isDemo is false, ALWAYS swap to real data.
        // The store initializes with demo data as defaults, so we must swap
        // regardless of what data appears to be loaded.
        if (state && !state.isDemo) {
          console.log('[Store] Rehydrated with isDemo=false, swapping to real data')
          useAppStore.setState({
            cashTransactions: state.realCashTransactions,
            accrualTransactions: state.realAccrualTransactions,
            accrualDocuments: [],
            suspenseItems: [],
            matches: state.realMatches,
            sessions: state.realSessions,
            activeSession: state.realActiveSession,
          })
        }
      },
    }
  )
)
