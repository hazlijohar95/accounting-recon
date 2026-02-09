/**
 * Data transformation utilities for spreadsheet view
 *
 * Converts reconciliation data from the app store/Convex format
 * to the spreadsheet data format expected by UniverSheet.
 */

import type {
  ReconciliationSheetData,
  TransactionRow,
  InvoiceRow,
  MatchStatus,
  MatchLayer,
  MatchLayerNumber,
} from './types'
import type { MatchPair, Transaction, SuspenseItem, AccrualDocument } from '@/lib/store'

/**
 * Layer number to layer name mapping
 */
const LAYER_NAMES: Record<MatchLayerNumber, MatchLayer> = {
  1: 'exact',
  2: 'window',
  3: 'reference',
  4: 'fuzzy',
  5: 'semantic',
  6: 'manual',
  7: 'partial',
}

/**
 * Convert match layer number to layer name
 */
function getLayerName(layer: MatchLayerNumber): MatchLayer {
  return LAYER_NAMES[layer] || 'manual'
}

/**
 * Type guard for SuspenseItem
 * Distinguishes SuspenseItem from Transaction based on unique properties
 */
function isSuspenseItem(item: SuspenseItem | Transaction): item is SuspenseItem {
  return (
    typeof (item as SuspenseItem).sourceType === 'string' &&
    typeof (item as SuspenseItem).transactionDate === 'string' &&
    typeof (item as SuspenseItem).reason === 'string'
  )
}

/**
 * Convert confidence level to match status
 */
function getMatchStatus(match: MatchPair): MatchStatus {
  if (match.approved) return 'matched'

  const score = match.confidenceScore || 0

  // High confidence = suggested for auto-match
  if (score >= 90) return 'suggested'
  // Medium confidence = suggested for review
  if (score >= 70) return 'suggested'
  // Low confidence = suspense
  return 'suspense'
}

/**
 * Transform MatchPair array and SuspenseItem array to spreadsheet data format
 *
 * @param matches - Array of match pairs from store/Convex
 * @param suspenseItems - Array of suspense items/transactions
 * @returns Spreadsheet data with transactions and invoices arrays
 */
export function transformToSpreadsheetData(
  matches: MatchPair[],
  suspenseItems: (SuspenseItem | Transaction)[]
): ReconciliationSheetData {
  const transactions: TransactionRow[] = []
  const invoices: InvoiceRow[] = []

  // Process matched pairs
  matches.forEach((match) => {
    const tx = match.cashTransaction

    // Add transaction row
    transactions.push({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      reference: tx.matchId || '',
      matchStatus: getMatchStatus(match),
      matchConfidence: (match.confidenceScore || 0) / 100,
      matchedBy: getLayerName(match.matchLayer),
      matchedInvoiceId: match.accrualDocument?.id || match.accrualTransaction?.id,
    })

    // Add invoice row from accrual document or transaction
    const accrualDoc = match.accrualDocument
    const accrualTx = match.accrualTransaction

    if (accrualDoc) {
      invoices.push({
        id: accrualDoc.id,
        invoiceNumber: accrualDoc.docNumber || '',
        date: accrualDoc.docDate,
        description: accrualDoc.description || `${accrualDoc.docNumber} - ${accrualDoc.counterparty || ''}`,
        amount: accrualDoc.amount,
        dueDate: accrualDoc.dueDate,
        matchStatus: getMatchStatus(match),
        matchConfidence: (match.confidenceScore || 0) / 100,
        matchedBy: getLayerName(match.matchLayer),
        matchedTransactionId: tx.id,
      })
    } else if (accrualTx) {
      invoices.push({
        id: accrualTx.id,
        invoiceNumber: '',
        date: accrualTx.date,
        description: accrualTx.description,
        amount: accrualTx.amount,
        matchStatus: getMatchStatus(match),
        matchConfidence: (match.confidenceScore || 0) / 100,
        matchedBy: getLayerName(match.matchLayer),
        matchedTransactionId: tx.id,
      })
    }
  })

  // Process suspense items (unmatched transactions)
  suspenseItems.forEach((item) => {
    // Handle both SuspenseItem and Transaction types using type guard
    if (isSuspenseItem(item)) {
      const suspense = item
      transactions.push({
        id: suspense.id,
        date: suspense.transactionDate,
        description: suspense.description,
        amount: suspense.amount,
        reference: '',
        matchStatus: 'suspense',
      })
    } else {
      const tx = item as Transaction
      transactions.push({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        reference: '',
        matchStatus: tx.status === 'suspense' ? 'suspense' : 'pending',
      })
    }
  })

  return { transactions, invoices }
}

/**
 * Transform a single transaction to spreadsheet row format
 */
export function transformTransaction(tx: Transaction): TransactionRow {
  return {
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    reference: tx.matchId || '',
    matchStatus: tx.status === 'matched' ? 'matched' : tx.status === 'suspense' ? 'suspense' : 'pending',
    matchConfidence: tx.confidence === 'high' ? 0.95 : tx.confidence === 'medium' ? 0.80 : 0.60,
  }
}

/**
 * Transform an accrual document to invoice row format
 */
export function transformAccrualDocument(doc: AccrualDocument): InvoiceRow {
  return {
    id: doc.id,
    invoiceNumber: doc.docNumber || '',
    date: doc.docDate,
    description: doc.description || `${doc.docNumber} - ${doc.counterparty || ''}`,
    amount: doc.amount,
    dueDate: doc.dueDate,
    matchStatus: doc.status === 'matched' ? 'matched' : doc.status === 'suspense' ? 'suspense' : 'pending',
  }
}
