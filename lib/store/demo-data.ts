/**
 * Demo data factories and lazy initializers for the application store.
 *
 * @module lib/store/demo-data
 */

import type {
  Transaction,
  MatchPair,
  AccrualDocument,
  SuspenseItem,
  ReconciliationSession,
  DemoWorkspace,
  DemoWorksheet,
  DemoWorksheetColumn,
  DemoWorksheetRow,
} from './types'

// =============================================================================
// DEMO TRANSACTION DATA
// =============================================================================

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

const createDemoMatches = (cash: Transaction[], accrual: Transaction[]): MatchPair[] => {
  const now = Date.now()
  return [
    { id: 'm1', cashTransaction: cash[0], accrualTransaction: accrual[0], confidence: 'high', matchLayer: 1, approved: true, status: 'approved', reviewedAt: now - 2 * 3_600_000 },
    { id: 'm2', cashTransaction: cash[1], accrualTransaction: accrual[1], confidence: 'high', matchLayer: 1, approved: true, status: 'approved', reviewedAt: now - 26 * 3_600_000 },
    { id: 'm3', cashTransaction: cash[3], accrualTransaction: accrual[3], confidence: 'high', matchLayer: 3, approved: true, status: 'approved', reviewedAt: now - 4 * 86_400_000 },
    { id: 'm4', cashTransaction: cash[6], accrualTransaction: accrual[5], confidence: 'high', matchLayer: 1, approved: false, status: 'pending' },
  ]
}

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
    description: 'AI\u2011assisted cash vs accrual review',
    updatedAt: Date.now() - 3600000,
  },
  {
    _id: 'demo-ws-2',
    name: 'Vendor Spend Review',
    description: 'Expense patterns and vendor risk signals',
    updatedAt: Date.now() - 86400000,
  },
]

const createDemoWorksheets = (): DemoWorksheet[] => [
  { _id: 'demo-sheet-1', workspaceId: 'demo-ws-1', name: 'Cash vs Accrual', updatedAt: Date.now() - 1800000 },
  { _id: 'demo-sheet-2', workspaceId: 'demo-ws-1', name: 'Exception Review', updatedAt: Date.now() - 7200000 },
  { _id: 'demo-sheet-3', workspaceId: 'demo-ws-2', name: 'Top Vendors', updatedAt: Date.now() - 172800000 },
]

const createDemoColumns = (): DemoWorksheetColumn[] => [
  { _id: 'demo-col-0', worksheetId: 'demo-sheet-1', order: 0, name: 'Cash Description', columnType: 'text', width: 170 },
  { _id: 'demo-col-1', worksheetId: 'demo-sheet-1', order: 1, name: 'Reference', columnType: 'text', width: 130 },
  { _id: 'demo-col-2', worksheetId: 'demo-sheet-1', order: 2, name: 'Suggested Accrual', columnType: 'formula', formula: '=ENRICH("Find matching invoice/vendor")', dataSource: 'llm', width: 190 },
  { _id: 'demo-col-3', worksheetId: 'demo-sheet-1', order: 3, name: 'Match Confidence', columnType: 'formula', formula: '=ENRICH("Estimate match confidence")', dataSource: 'llm', width: 150 },
  { _id: 'demo-col-4', worksheetId: 'demo-sheet-1', order: 4, name: 'Days Difference', columnType: 'number', width: 120 },
  { _id: 'demo-col-5', worksheetId: 'demo-sheet-1', order: 5, name: 'Notes', columnType: 'text', width: 160 },
  { _id: 'demo-col-10', worksheetId: 'demo-sheet-2', order: 0, name: 'Exception', columnType: 'text', width: 200 },
  { _id: 'demo-col-11', worksheetId: 'demo-sheet-2', order: 1, name: 'Amount', columnType: 'number', width: 120 },
  { _id: 'demo-col-12', worksheetId: 'demo-sheet-2', order: 2, name: 'Suggested Action', columnType: 'formula', formula: '=ENRICH("Suggest action")', dataSource: 'llm', width: 180 },
  { _id: 'demo-col-20', worksheetId: 'demo-sheet-3', order: 0, name: 'Vendor', columnType: 'text', width: 180 },
  { _id: 'demo-col-21', worksheetId: 'demo-sheet-3', order: 1, name: 'Category', columnType: 'text', width: 140 },
  { _id: 'demo-col-22', worksheetId: 'demo-sheet-3', order: 2, name: 'YTD Spend', columnType: 'number', width: 140 },
  { _id: 'demo-col-23', worksheetId: 'demo-sheet-3', order: 3, name: 'Risk Flag', columnType: 'formula', formula: '=ENRICH("Flag anomalies or risk")', dataSource: 'llm', width: 140 },
]

const createDemoRows = (): DemoWorksheetRow[] => [
  {
    _id: 'demo-row-1',
    worksheetId: 'demo-sheet-1',
    rowNumber: 0,
    cells: { col_0: 'Client Payment - TechStart', col_1: 'INV-1029', col_2: 'Invoice #1029 \u00b7 TechStart', col_3: 'High', col_4: 2, col_5: 'Exact amount' },
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
    cells: { col_0: 'Supplier Transfer - FreshFoods', col_1: 'INV-7781', col_2: 'Invoice #7781 \u00b7 FreshFoods', col_3: 'High', col_4: 1, col_5: 'Reference match' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-4',
    worksheetId: 'demo-sheet-1',
    rowNumber: 3,
    cells: { col_0: 'Payroll - Jan 2025', col_1: 'PAY-0101', col_2: 'Payroll Journal \u00b7 Jan', col_3: 'Medium', col_4: 0, col_5: 'Date matches' },
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
    cells: { col_0: 'Software Subscription - Atlas', col_1: 'SUB-442', col_2: 'Invoice #SUB-442 \u00b7 Atlas', col_3: 'Low', col_4: 15, col_5: 'Amount variance' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
  {
    _id: 'demo-row-8',
    worksheetId: 'demo-sheet-1',
    rowNumber: 7,
    cells: { col_0: 'Client Payment - Nova Labs', col_1: 'INV-1091', col_2: 'Invoice #1091 \u00b7 Nova Labs', col_3: 'High', col_4: 1, col_5: 'Exact match' },
    cellStatus: { col_2: 'complete', col_3: 'complete' },
  },
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

export const demoWorkspaceData = initDemoWorkspaceData()

// Initialize demo data lazily
export const initDemoData = () => {
  const cash = createDemoCashTransactions()
  const accrual = createDemoAccrualTransactions()
  const matches = createDemoMatches(cash, accrual)
  const accrualDocuments = createDemoAccrualDocuments()
  const suspenseItems = createDemoSuspenseItems()
  const session = createDemoSession()
  return { cash, accrual, matches, accrualDocuments, suspenseItems, session }
}

export const demoData = initDemoData()
