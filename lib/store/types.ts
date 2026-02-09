/**
 * Type definitions for the Reconciled application state.
 *
 * @module lib/store/types
 */

import { Id } from '@/convex/_generated/dataModel'

// =============================================================================
// DEMO WORKSPACE TYPES
// =============================================================================

export interface DemoWorkspace {
  _id: string
  name: string
  description?: string
  updatedAt: number
}

export interface DemoWorksheet {
  _id: string
  workspaceId: string
  name: string
  updatedAt: number
}

export interface DemoWorksheetColumn {
  _id: string
  worksheetId: string
  order: number
  name: string
  columnType: 'text' | 'number' | 'formula'
  formula?: string
  dataSource?: string
  width?: number
}

export interface DemoWorksheetRow {
  _id: string
  worksheetId: string
  rowNumber: number
  cells: Record<string, unknown>
  cellStatus: Record<string, string>
  cellErrors?: Record<string, string>
}

// =============================================================================
// CORE DOMAIN TYPES
// =============================================================================

/** User type for authenticated users */
export interface AuthUser {
  id: Id<'users'>
  email: string
  name?: string
  avatarUrl?: string
  workosId: string
}

/** Company type for multi-tenant company selection */
export interface Company {
  id: Id<'companies'>
  name: string
  code?: string
}

export type TransactionStatus = 'matched' | 'pending' | 'suspense'
export type MatchConfidence = 'high' | 'medium' | 'low'

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'cash' | 'accrual'
  status: TransactionStatus
  matchId?: string
  confidence?: MatchConfidence
  category?: string
}

export interface MatchPair {
  id: string
  cashTransaction: Transaction
  accrualTransaction: Transaction
  accrualDocument?: AccrualDocument
  confidence: MatchConfidence
  confidenceScore?: number
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7
  matchReason?: string
  approved: boolean
  partialMatchGroupId?: string
  reviewedAt?: number
  reviewedBy?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export type AccrualDocType = 'sales_invoice' | 'purchase_invoice' | 'pos_report' | 'settlement' | 'receipt'
export type AccrualDocStatus = 'pending' | 'matched' | 'partial' | 'suspense'

export interface AccrualDocument {
  id: string
  docType: AccrualDocType
  docNumber?: string
  docDate: string
  dueDate?: string
  counterparty?: string
  amount: number
  taxAmount?: number
  description?: string
  status: AccrualDocStatus
  matchId?: string
}

export type SuspenseStatus = 'open' | 'queried' | 'resolved'

export interface SuspenseItem {
  id: string
  sourceType: 'cash' | 'accrual'
  sourceId: string
  amount: number
  transactionDate: string
  description: string
  reason: string
  suggestedAction: string
  status: SuspenseStatus
  resolutionNotes?: string
}

export interface ReconciliationSession {
  id: string
  name: string
  createdAt: string
  status: 'draft' | 'processing' | 'review' | 'completed'
  progress: number
  totalCash: number
  totalAccrual: number
  matchedCount: number
  suspenseCount: number
}

// =============================================================================
// APP STATE INTERFACE
// =============================================================================

export interface AppState {
  // Demo mode
  isDemo: boolean

  // Transactions
  cashTransactions: Transaction[]
  accrualTransactions: Transaction[]
  addTransactions: (transactions: Transaction[], type: 'cash' | 'accrual') => void

  // Accrual Documents
  accrualDocuments: AccrualDocument[]

  // Suspense Items
  suspenseItems: SuspenseItem[]

  // Matches
  matches: MatchPair[]
  approveMatch: (matchId: string) => void
  rejectMatch: (matchId: string) => void
  revertMatchApproval: (matchId: string) => void
  revertMatchRejection: (matchId: string, match: MatchPair) => void
  createManualMatch: (cashTxId: string, accrualDocId: string, confidence: MatchConfidence) => void

  // Sessions
  sessions: ReconciliationSession[]
  activeSession: ReconciliationSession | null
  createSession: (name: string) => void

  // Processing
  isProcessing: boolean
  processingProgress: number
  startProcessing: () => void

  // Paywall
  showPaywall: boolean
  setShowPaywall: (show: boolean) => void

  // Onboarding
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
  onboardingData: Record<string, string>
  setOnboardingData: (data: Record<string, string>) => void

  // Match celebration
  showCelebration: boolean
  setShowCelebration: (show: boolean) => void

  // Real mode data storage
  realCashTransactions: Transaction[]
  realAccrualTransactions: Transaction[]
  realMatches: MatchPair[]
  realSessions: ReconciliationSession[]
  realActiveSession: ReconciliationSession | null

  // Mode toggle actions
  toggleMode: () => void
  clearRealData: () => void

  // User & Company state
  currentUser: AuthUser | null
  setCurrentUser: (user: AuthUser | null) => void
  selectedCompanyId: Id<'companies'> | null
  setSelectedCompanyId: (id: Id<'companies'> | null) => void
  companies: Company[]
  setCompanies: (companies: Company[]) => void

  // Workspace selection
  selectedWorkspaceId: Id<'workspaces'> | null
  setSelectedWorkspaceId: (id: Id<'workspaces'> | null) => void

  // Sidebar state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // AI Assistant state
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  showReasoningOverlay: boolean
  setShowReasoningOverlay: (show: boolean) => void

  // Processing count for sidebar badge
  processingDocumentsCount: number
  setProcessingDocumentsCount: (count: number) => void

  // Demo workspace data
  demoWorkspaces: DemoWorkspace[]
  demoWorksheets: DemoWorksheet[]
  demoColumns: DemoWorksheetColumn[]
  demoRows: DemoWorksheetRow[]

  // Guard action helper
  guardAction: () => boolean
}
