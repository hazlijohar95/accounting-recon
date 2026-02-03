/**
 * Global Application State Store (Zustand).
 *
 * This module provides centralized state management for the Reconciled application
 * using Zustand with persistence middleware. It manages:
 *
 * State Categories:
 * - Demo/Real mode toggle with separate data storage
 * - Transactions (cash and accrual) with CRUD operations
 * - Match pairs with approve/reject/manual-create actions
 * - Accrual documents and suspense items
 * - Reconciliation sessions with progress tracking
 * - User authentication and company selection
 * - UI state (sidebar, modals, onboarding, celebration)
 *
 * Performance Optimizations:
 * - Typed selectors prevent unnecessary re-renders
 * - useShallow for composite selectors
 * - Lazy demo data initialization
 * - Persisted sidebar state only (minimal localStorage footprint)
 *
 * @module lib/store
 *
 * @example
 * ```tsx
 * // Using individual selectors (recommended)
 * const isDemo = useIsDemo()
 * const matches = useMatches()
 * const approveMatch = useApproveMatch()
 *
 * // Using composite selectors for related state
 * const { companies, setSelectedCompanyId } = useCompanyState()
 * ```
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { Id } from '@/convex/_generated/dataModel'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// Demo workspace types (matching Convex structure)
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
  accrualDocument?: AccrualDocument // New - for accrualDocuments table
  confidence: MatchConfidence
  confidenceScore?: number // Numeric confidence (0-100)
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6
  matchReason?: string // Why this match was suggested (especially for AI matches)
  approved: boolean
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

interface AppState {
  // Demo mode
  isDemo: boolean

  // Transactions
  cashTransactions: Transaction[]
  accrualTransactions: Transaction[]
  addTransactions: (transactions: Transaction[], type: 'cash' | 'accrual') => void

  // Accrual Documents (new)
  accrualDocuments: AccrualDocument[]

  // Suspense Items (new)
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

  // Real mode data storage (persisted separately from demo)
  realCashTransactions: Transaction[]
  realAccrualTransactions: Transaction[]
  realMatches: MatchPair[]
  realSessions: ReconciliationSession[]
  realActiveSession: ReconciliationSession | null

  // Mode toggle actions
  toggleMode: () => void
  clearRealData: () => void

  // User & Company state (for authenticated mode)
  currentUser: AuthUser | null
  setCurrentUser: (user: AuthUser | null) => void
  selectedCompanyId: Id<'companies'> | null
  setSelectedCompanyId: (id: Id<'companies'> | null) => void
  companies: Company[]
  setCompanies: (companies: Company[]) => void

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

  // Demo workspace data (for workspace feature demo mode)
  demoWorkspaces: DemoWorkspace[]
  demoWorksheets: DemoWorksheet[]
  demoColumns: DemoWorksheetColumn[]
  demoRows: DemoWorksheetRow[]

  // Guard action helper - returns true if action should be blocked (demo mode)
  guardAction: () => boolean
}

// Lazy demo data initialization - only computed when store is created
const createDemoCashTransactions = (): Transaction[] => [
  { id: 'c1', date: '2025-01-15', description: 'AWS Services - Monthly', amount: -2450.00, type: 'cash', status: 'matched', matchId: 'm1', confidence: 'high' },
  { id: 'c2', date: '2025-01-18', description: 'Client Payment - Acme Corp', amount: 15000.00, type: 'cash', status: 'matched', matchId: 'm2', confidence: 'high' },
  { id: 'c3', date: '2025-01-20', description: 'Office Supplies - Staples', amount: -342.50, type: 'cash', status: 'pending', confidence: 'medium' },
  { id: 'c4', date: '2025-01-22', description: 'PAYROLL - January', amount: -28500.00, type: 'cash', status: 'matched', matchId: 'm3', confidence: 'high' },
  { id: 'c5', date: '2025-01-25', description: 'Unknown Transfer', amount: -1200.00, type: 'cash', status: 'suspense' },
  { id: 'c6', date: '2025-01-26', description: 'Software License - Adobe', amount: -599.99, type: 'cash', status: 'pending', confidence: 'low' },
  { id: 'c7', date: '2025-01-27', description: 'Client Payment - TechStart', amount: 8500.00, type: 'cash', status: 'matched', matchId: 'm4', confidence: 'high' },
]

const createDemoAccrualTransactions = (): Transaction[] => [
  { id: 'a1', date: '2025-01-14', description: 'INV-2025-001 AWS Infrastructure', amount: -2450.00, type: 'accrual', status: 'matched', matchId: 'm1', category: 'Cloud Services' },
  { id: 'a2', date: '2025-01-17', description: 'INV-2025-002 Acme Corp Project', amount: 15000.00, type: 'accrual', status: 'matched', matchId: 'm2', category: 'Revenue' },
  { id: 'a3', date: '2025-01-19', description: 'INV-2025-003 Office Equipment', amount: -350.00, type: 'accrual', status: 'pending', category: 'Office' },
  { id: 'a4', date: '2025-01-22', description: 'Payroll Expense - January 2025', amount: -28500.00, type: 'accrual', status: 'matched', matchId: 'm3', category: 'Payroll' },
  { id: 'a5', date: '2025-01-26', description: 'INV-2025-004 Adobe Creative Suite', amount: -599.99, type: 'accrual', status: 'pending', category: 'Software' },
  { id: 'a6', date: '2025-01-27', description: 'INV-2025-005 TechStart Consulting', amount: 8500.00, type: 'accrual', status: 'matched', matchId: 'm4', category: 'Revenue' },
]

const createDemoMatches = (cash: Transaction[], accrual: Transaction[]): MatchPair[] => [
  { id: 'm1', cashTransaction: cash[0], accrualTransaction: accrual[0], confidence: 'high', matchLayer: 1, approved: true },
  { id: 'm2', cashTransaction: cash[1], accrualTransaction: accrual[1], confidence: 'high', matchLayer: 1, approved: true },
  { id: 'm3', cashTransaction: cash[3], accrualTransaction: accrual[3], confidence: 'high', matchLayer: 3, approved: true },
  { id: 'm4', cashTransaction: cash[6], accrualTransaction: accrual[5], confidence: 'high', matchLayer: 1, approved: false },
]

const createDemoAccrualDocuments = (): AccrualDocument[] => [
  { id: 'ad1', docType: 'sales_invoice', docNumber: 'INV-2025-001', docDate: '2025-01-14', counterparty: 'AWS', amount: -2450.00, status: 'matched', matchId: 'm1' },
  { id: 'ad2', docType: 'sales_invoice', docNumber: 'INV-2025-002', docDate: '2025-01-17', counterparty: 'Acme Corp', amount: 15000.00, status: 'matched', matchId: 'm2' },
  { id: 'ad3', docType: 'purchase_invoice', docNumber: 'INV-2025-003', docDate: '2025-01-19', counterparty: 'Office Depot', amount: -350.00, status: 'pending' },
  { id: 'ad4', docType: 'receipt', docNumber: 'RCP-2025-001', docDate: '2025-01-22', description: 'Payroll January', amount: -28500.00, status: 'matched', matchId: 'm3' },
  { id: 'ad5', docType: 'purchase_invoice', docNumber: 'INV-2025-004', docDate: '2025-01-26', counterparty: 'Adobe', amount: -599.99, status: 'pending' },
  { id: 'ad6', docType: 'sales_invoice', docNumber: 'INV-2025-005', docDate: '2025-01-27', counterparty: 'TechStart', amount: 8500.00, status: 'matched', matchId: 'm4' },
]

const createDemoSuspenseItems = (): SuspenseItem[] => [
  {
    id: 'si1',
    sourceType: 'cash',
    sourceId: 'c5',
    amount: -1200.00,
    transactionDate: '2025-01-25',
    description: 'Unknown Transfer',
    reason: 'no_match',
    suggestedAction: 'Request bank statement details or check with client',
    status: 'open',
  },
]

const createDemoSession = (): ReconciliationSession => ({
  id: 's1',
  name: 'January 2025 Reconciliation',
  createdAt: '2025-01-28',
  status: 'review',
  progress: 78,
  totalCash: 7,
  totalAccrual: 6,
  matchedCount: 4,
  suspenseCount: 1,
})

// =============================================================================
// DEMO WORKSPACE DATA
// =============================================================================

const createDemoWorkspaces = (): DemoWorkspace[] => [
  {
    _id: 'demo-ws-1',
    name: 'Bank Reconciliation Audit',
    description: 'AI‑assisted cash vs accrual review',
    updatedAt: Date.now() - 3600000, // 1 hour ago
  },
  {
    _id: 'demo-ws-2',
    name: 'Vendor Spend Review',
    description: 'Expense patterns and vendor risk signals',
    updatedAt: Date.now() - 86400000, // 1 day ago
  },
]

const createDemoWorksheets = (): DemoWorksheet[] => [
  // Workspace 1: Bank Reconciliation Audit
  { _id: 'demo-sheet-1', workspaceId: 'demo-ws-1', name: 'Cash vs Accrual', updatedAt: Date.now() - 1800000 },
  { _id: 'demo-sheet-2', workspaceId: 'demo-ws-1', name: 'Exception Review', updatedAt: Date.now() - 7200000 },
  // Workspace 2: Vendor Spend Review
  { _id: 'demo-sheet-3', workspaceId: 'demo-ws-2', name: 'Top Vendors', updatedAt: Date.now() - 172800000 },
]

const createDemoColumns = (): DemoWorksheetColumn[] => [
  // Cash vs Accrual sheet columns
  { _id: 'demo-col-0', worksheetId: 'demo-sheet-1', order: 0, name: 'Cash Description', columnType: 'text', width: 170 },
  { _id: 'demo-col-1', worksheetId: 'demo-sheet-1', order: 1, name: 'Reference', columnType: 'text', width: 130 },
  { _id: 'demo-col-2', worksheetId: 'demo-sheet-1', order: 2, name: 'Suggested Accrual', columnType: 'formula', formula: '=ENRICH("Find matching invoice/vendor")', dataSource: 'llm', width: 190 },
  { _id: 'demo-col-3', worksheetId: 'demo-sheet-1', order: 3, name: 'Match Confidence', columnType: 'formula', formula: '=ENRICH("Estimate match confidence")', dataSource: 'llm', width: 150 },
  { _id: 'demo-col-4', worksheetId: 'demo-sheet-1', order: 4, name: 'Days Difference', columnType: 'number', width: 120 },
  { _id: 'demo-col-5', worksheetId: 'demo-sheet-1', order: 5, name: 'Notes', columnType: 'text', width: 160 },
  // Exception Review sheet columns
  { _id: 'demo-col-10', worksheetId: 'demo-sheet-2', order: 0, name: 'Exception', columnType: 'text', width: 200 },
  { _id: 'demo-col-11', worksheetId: 'demo-sheet-2', order: 1, name: 'Amount', columnType: 'number', width: 120 },
  { _id: 'demo-col-12', worksheetId: 'demo-sheet-2', order: 2, name: 'Suggested Action', columnType: 'formula', formula: '=ENRICH("Suggest action")', dataSource: 'llm', width: 180 },
  // Top Vendors sheet columns
  { _id: 'demo-col-20', worksheetId: 'demo-sheet-3', order: 0, name: 'Vendor', columnType: 'text', width: 180 },
  { _id: 'demo-col-21', worksheetId: 'demo-sheet-3', order: 1, name: 'Category', columnType: 'text', width: 140 },
  { _id: 'demo-col-22', worksheetId: 'demo-sheet-3', order: 2, name: 'YTD Spend', columnType: 'number', width: 140 },
  { _id: 'demo-col-23', worksheetId: 'demo-sheet-3', order: 3, name: 'Risk Flag', columnType: 'formula', formula: '=ENRICH("Flag anomalies or risk")', dataSource: 'llm', width: 140 },
]

const createDemoRows = (): DemoWorksheetRow[] => [
  // Cash vs Accrual sheet rows
  {
    _id: 'demo-row-1',
    worksheetId: 'demo-sheet-1',
    rowNumber: 0,
    cells: { col_0: 'Client Payment - TechStart', col_1: 'INV-1029', col_2: 'Invoice #1029 · TechStart', col_3: 'High', col_4: 2, col_5: 'Exact amount' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-2',
    worksheetId: 'demo-sheet-1',
    rowNumber: 1,
    cells: { col_0: 'POS Settlement - Maybank', col_1: 'SETT-5582', col_2: 'POS Batch 5582', col_3: 'Medium', col_4: 3, col_5: 'Within 3 days' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-3',
    worksheetId: 'demo-sheet-1',
    rowNumber: 2,
    cells: { col_0: 'Supplier Transfer - FreshFoods', col_1: 'INV-7781', col_2: 'Invoice #7781 · FreshFoods', col_3: 'High', col_4: 1, col_5: 'Reference match' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-4',
    worksheetId: 'demo-sheet-1',
    rowNumber: 3,
    cells: { col_0: 'Payroll - Jan 2025', col_1: 'PAY-0101', col_2: 'Payroll Journal · Jan', col_3: 'Medium', col_4: 0, col_5: 'Date matches' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-5',
    worksheetId: 'demo-sheet-1',
    rowNumber: 4,
    cells: { col_0: 'Utility Bill - TNB', col_1: 'UTIL-9902', col_2: '', col_3: '', col_4: 9, col_5: 'Date outside range' },
    cellStatus: { col_2: 'running', col_3: 'pending' },
  },
  {
    _id: 'demo-row-6',
    worksheetId: 'demo-sheet-1',
    rowNumber: 5,
    cells: { col_0: 'Refund - Card Chargeback', col_1: 'CB-2031', col_2: '', col_3: '', col_4: 4, col_5: 'Manual review' },
    cellStatus: { col_2: 'pending', col_3: 'idle' },
  },
  {
    _id: 'demo-row-7',
    worksheetId: 'demo-sheet-1',
    rowNumber: 6,
    cells: { col_0: 'Software Subscription - Atlas', col_1: 'SUB-442', col_2: 'Invoice #SUB-442 · Atlas', col_3: 'Low', col_4: 15, col_5: 'Amount variance' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-8',
    worksheetId: 'demo-sheet-1',
    rowNumber: 7,
    cells: { col_0: 'Client Payment - Nova Labs', col_1: 'INV-1091', col_2: 'Invoice #1091 · Nova Labs', col_3: 'High', col_4: 1, col_5: 'Exact match' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  // Exception Review sheet rows
  {
    _id: 'demo-row-20',
    worksheetId: 'demo-sheet-2',
    rowNumber: 0,
    cells: { col_0: 'Amount mismatch > 10%', col_1: 1320, col_2: 'Verify invoice total' },
    cellStatus: { col_2: 'complete' },
  },
  {
    _id: 'demo-row-21',
    worksheetId: 'demo-sheet-2',
    rowNumber: 1,
    cells: { col_0: 'Date outside window', col_1: 8500, col_2: 'Check settlement delay' },
    cellStatus: { col_2: 'complete' },
  },
  // Top Vendors sheet rows
  {
    _id: 'demo-row-30',
    worksheetId: 'demo-sheet-3',
    rowNumber: 0,
    cells: { col_0: 'FreshFoods Sdn Bhd', col_1: 'Inventory', col_2: 58200, col_3: 'Stable' },
    cellStatus: { col_3: 'complete' },
  },
  {
    _id: 'demo-row-31',
    worksheetId: 'demo-sheet-3',
    rowNumber: 1,
    cells: { col_0: 'PrintWorks Co', col_1: 'Marketing', col_2: 21400, col_3: 'Review terms' },
    cellStatus: { col_3: 'complete' },
  },
]

// Demo credits for display
export const demoCredits = {
  balance: 47,
  totalPurchased: 100,
  totalUsed: 53,
}

// Initialize demo workspace data lazily
const initDemoWorkspaceData = () => {
  const workspaces = createDemoWorkspaces()
  const worksheets = createDemoWorksheets()
  const columns = createDemoColumns()
  const rows = createDemoRows()
  return { workspaces, worksheets, columns, rows }
}

const demoWorkspaceData = initDemoWorkspaceData()

// Initialize demo data lazily
const initDemoData = () => {
  const cash = createDemoCashTransactions()
  const accrual = createDemoAccrualTransactions()
  const matches = createDemoMatches(cash, accrual)
  const accrualDocuments = createDemoAccrualDocuments()
  const suspenseItems = createDemoSuspenseItems()
  const session = createDemoSession()
  return { cash, accrual, matches, accrualDocuments, suspenseItems, session }
}

const demoData = initDemoData()

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
    matches: state.matches.map(m => m.id === matchId ? { ...m, approved: true } : m)
  })),
  rejectMatch: (matchId) => set((state) => ({
    matches: state.matches.filter(m => m.id !== matchId)
  })),
  revertMatchApproval: (matchId) => set((state) => ({
    matches: state.matches.map(m => m.id === matchId ? { ...m, approved: false } : m)
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

// =============================================================================
// TYPED SELECTORS
// =============================================================================
// These selectors prevent unnecessary re-renders by subscribing to specific
// state slices instead of the entire store. Always prefer these over
// direct useAppStore() calls.

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
// These selectors use useShallow to prevent object reference changes from
// causing re-renders. Use when you need multiple related state values.

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
// MODE-AWARE SELECTORS (auto-switch between demo/real data based on isDemo)
// =============================================================================
// IMPORTANT: These hooks are now implemented in convex-hooks.ts to properly
// query Convex in real mode. Re-exported here for backward compatibility.
//
// FIX P0-1/P0-2: Previously returned [] or stale data in real mode.
// Now properly query Convex backend in real mode.

// Re-export mode-aware safe hooks from convex-hooks.ts
export {
  useCashTransactionsSafe,
  useAccrualDocumentsSafe,
  useSuspenseItemsSafe,
  useMatchesSafe,
  useSessionsSafe,
  useActiveSessionSafe,
} from "./convex-hooks";

/** Returns accrual transactions - demo data in Demo mode, real data in Real mode */
export const useAccrualTransactionsSafe = () => useAppStore((state) =>
  state.isDemo ? state.accrualTransactions : state.realAccrualTransactions
)

// =============================================================================
// DOMAIN-GROUPED SELECTORS
// =============================================================================
// These composite selectors group related state for cleaner imports and better DX.

/**
 * Combined reconciliation state and actions.
 * Use this when working with match approval/rejection workflows.
 *
 * @example
 * ```tsx
 * const { matches, approveMatch, rejectMatch, revertMatchApproval } = useReconciliationState()
 * ```
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
 * Use this when working with reconciliation sessions.
 *
 * @example
 * ```tsx
 * const { sessions, activeSession, createSession } = useSessionManagement()
 * ```
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
 * Use this for read-only access to transaction data.
 *
 * @example
 * ```tsx
 * const { cashTransactions, accrualTransactions, accrualDocuments, suspenseItems } = useTransactionData()
 * ```
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
 * Use this for managing global UI visibility states.
 *
 * @example
 * ```tsx
 * const { showPaywall, setShowPaywall, assistantOpen, setAssistantOpen } = useUIState()
 * ```
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
