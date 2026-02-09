/**
 * Reconciliation Source Adapter
 *
 * Fetches and transforms reconciliation data (matches + suspense items)
 * into spreadsheet format.
 *
 * @module components/unified-sheet/data-sources/reconciliation-source
 */

import type { Id, Doc } from '@/convex/_generated/dataModel'
import type {
  ReconciliationSourceConfig,
  ReconciliationSheetRow,
  ReconciliationColumnDef,
  ReconciliationDataResult,
} from './types'
import { MATCH_LAYER_NAMES } from './types'

/**
 * Standard column definitions for reconciliation data
 */
export const RECONCILIATION_COLUMNS: ReconciliationColumnDef[] = [
  { key: 'rowType', name: 'Type', width: 80, editable: false },
  { key: 'cashDate', name: 'Cash Date', width: 100, editable: false },
  { key: 'cashDescription', name: 'Cash Description', width: 200, editable: false },
  { key: 'cashAmount', name: 'Cash Amount', width: 120, editable: false },
  { key: 'cashReference', name: 'Cash Reference', width: 120, editable: false },
  { key: 'accrualDocNumber', name: 'Doc Number', width: 100, editable: false },
  { key: 'accrualDate', name: 'Doc Date', width: 100, editable: false },
  { key: 'accrualDescription', name: 'Doc Description', width: 200, editable: false },
  { key: 'accrualAmount', name: 'Doc Amount', width: 120, editable: false },
  { key: 'accrualCounterparty', name: 'Counterparty', width: 150, editable: false },
  { key: 'matchConfidence', name: 'Confidence %', width: 100, editable: false },
  { key: 'matchLayerName', name: 'Match Type', width: 100, editable: false },
  { key: 'matchStatus', name: 'Status', width: 100, editable: false },
]

/**
 * Type for enriched match from Convex
 */
interface EnrichedMatch {
  _id: Id<'matchedPairs'>
  sessionId: Id<'reconciliationSessions'>
  cashTransactionId: Id<'transactions'>
  accrualDocumentId?: Id<'accrualDocuments'>
  accrualTransactionId?: Id<'transactions'>
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7
  matchReason?: string
  status: 'pending' | 'approved' | 'rejected'
  cashTransaction: Doc<'transactions'> | null
  accrualTransaction?: Doc<'transactions'> | null
  accrualDocument?: Doc<'accrualDocuments'> | null
}

/**
 * Type for suspense item from Convex
 */
interface SuspenseItemDoc {
  _id: Id<'suspenseItems'>
  sessionId: Id<'reconciliationSessions'>
  sourceType: 'cash' | 'accrual'
  sourceId: Id<'transactions'> | Id<'accrualDocuments'>
  amount: number
  transactionDate: string
  description: string
  reason: string
  suggestedAction: string
  status: 'open' | 'queried' | 'resolved'
}

/**
 * Transform a match into a spreadsheet row
 */
function transformMatch(match: EnrichedMatch): ReconciliationSheetRow {
  const cashTx = match.cashTransaction
  const accrualDoc = match.accrualDocument
  const accrualTx = match.accrualTransaction

  return {
    id: match._id,
    rowType: 'match',
    sourceType: 'cash', // Matches are centered on cash transactions

    // Cash fields
    cashDate: cashTx?.date,
    cashDescription: cashTx?.description,
    cashAmount: cashTx?.amount,
    cashReference: cashTx?.reference,

    // Accrual fields - prefer accrualDocument over accrualTransaction
    accrualDocNumber: accrualDoc?.docNumber ?? '',
    accrualDate: accrualDoc?.docDate ?? accrualTx?.date,
    accrualDescription: accrualDoc?.description ?? accrualTx?.description,
    accrualAmount: accrualDoc?.amount ?? accrualTx?.amount,
    accrualCounterparty: accrualDoc?.counterparty,
    accrualDueDate: accrualDoc?.dueDate,

    // Match fields
    matchConfidence: match.confidenceScore,
    matchLayer: match.matchLayer,
    matchLayerName: MATCH_LAYER_NAMES[match.matchLayer] ?? 'unknown',
    matchReason: match.matchReason,
    matchStatus: match.status,
  }
}

/**
 * Transform a suspense item into a spreadsheet row
 */
function transformSuspenseItem(item: SuspenseItemDoc): ReconciliationSheetRow {
  return {
    id: item._id,
    rowType: 'suspense',
    sourceType: item.sourceType,

    // Fill appropriate side based on source type
    ...(item.sourceType === 'cash' ? {
      cashDate: item.transactionDate,
      cashDescription: item.description,
      cashAmount: item.amount,
    } : {
      accrualDate: item.transactionDate,
      accrualDescription: item.description,
      accrualAmount: item.amount,
    }),

    // Suspense fields
    suspenseReason: item.reason,
    suspenseStatus: item.status,
    suspenseSuggestedAction: item.suggestedAction,
    matchStatus: 'pending', // Suspense items are unmatched
  }
}

/**
 * Fetch reconciliation data from Convex queries
 *
 * This function is meant to be used with Convex query results.
 * It transforms the raw data into spreadsheet format.
 *
 * @param config - Source configuration
 * @param matches - Matches from useSessionMatches hook
 * @param suspenseItems - Suspense items from useSessionSuspenseItems hook
 * @param session - Session from useSession hook
 * @returns Transformed data ready for spreadsheet
 */
export function fetchReconciliationData(
  config: ReconciliationSourceConfig,
  matches: EnrichedMatch[] | undefined,
  suspenseItems: SuspenseItemDoc[] | undefined,
  session: { name: string; status: string } | undefined
): ReconciliationDataResult | null {
  // Return null if data not yet loaded
  if (!session) {
    return null
  }

  const rows: ReconciliationSheetRow[] = []

  // Process matches
  if (config.includeMatches !== false && matches) {
    const filteredMatches = config.matchStatusFilter
      ? matches.filter((m) => m.status === config.matchStatusFilter)
      : matches

    rows.push(...filteredMatches.map(transformMatch))
  }

  // Process suspense items
  if (config.includeSuspense !== false && suspenseItems) {
    const filteredSuspense = config.suspenseStatusFilter
      ? suspenseItems.filter((s) => s.status === config.suspenseStatusFilter)
      : suspenseItems

    rows.push(...filteredSuspense.map(transformSuspenseItem))
  }

  return {
    rows,
    columns: RECONCILIATION_COLUMNS,
    totalMatches: matches?.length ?? 0,
    totalSuspense: suspenseItems?.length ?? 0,
    sessionName: session.name,
    sessionStatus: session.status,
  }
}

/**
 * Get the linked column indices for reconciliation data
 * These columns should be read-only as they're populated from the session.
 */
export function getReconciliationLinkedColumns(): number[] {
  // All reconciliation columns except user-added columns are linked
  return RECONCILIATION_COLUMNS.map((_, index) => index)
}

/**
 * Convert reconciliation rows to Univer-compatible cell format
 */
export function reconciliationRowsToCells(
  rows: ReconciliationSheetRow[],
  columns: ReconciliationColumnDef[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const cells: Record<string, unknown> = {}

    columns.forEach((col, index) => {
      const key = `col_${index}`
      const value = row[col.key as keyof ReconciliationSheetRow]

      // Format specific values
      if (col.key === 'matchConfidence' && typeof value === 'number') {
        cells[key] = `${Math.round(value)}%`
      } else if ((col.key === 'cashAmount' || col.key === 'accrualAmount') && typeof value === 'number') {
        cells[key] = value.toFixed(2)
      } else {
        cells[key] = value ?? ''
      }
    })

    return cells
  })
}
