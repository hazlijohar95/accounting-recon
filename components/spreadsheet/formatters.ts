/**
 * Shared row formatters for spreadsheet display
 *
 * Single source of truth for transforming typed row objects to raw cell arrays.
 * Used by both jspreadsheet-sheet.tsx and any other spreadsheet implementations.
 */

import type { TransactionRow, InvoiceRow } from './types'
import { formatConfidence } from './constants'

/**
 * Raw cell array type for spreadsheet data
 */
export type CellArray = (string | number)[]

/**
 * Transform a single transaction row to cell array format
 * Order: [date, description, amount, reference, matchStatus, confidence]
 */
export function formatTransactionRow(tx: TransactionRow): CellArray {
  return [
    tx.date,
    tx.description,
    tx.amount,
    tx.reference ?? '',
    tx.matchStatus,
    tx.matchConfidence ? formatConfidence(tx.matchConfidence) : '',
  ]
}

/**
 * Transform a single invoice row to cell array format
 * Order: [invoiceNumber, date, description, amount, dueDate, matchStatus, confidence]
 */
export function formatInvoiceRow(inv: InvoiceRow): CellArray {
  return [
    inv.invoiceNumber,
    inv.date,
    inv.description,
    inv.amount,
    inv.dueDate ?? '',
    inv.matchStatus,
    inv.matchConfidence ? formatConfidence(inv.matchConfidence) : '',
  ]
}

/**
 * Transform transaction rows to spreadsheet data format
 */
export function formatTransactionData(transactions: TransactionRow[]): CellArray[] {
  if (!transactions?.length) return []
  return transactions.map(formatTransactionRow)
}

/**
 * Transform invoice rows to spreadsheet data format
 */
export function formatInvoiceData(invoices: InvoiceRow[]): CellArray[] {
  if (!invoices?.length) return []
  return invoices.map(formatInvoiceRow)
}
