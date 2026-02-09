/**
 * Reconciliation plugin column presets
 *
 * Pre-defined column configurations for transactions and invoices.
 */

import type { ColumnPreset, ColumnDef } from '../../core/types'

// =============================================================================
// TRANSACTION COLUMNS
// =============================================================================

/**
 * Transaction sheet column definitions
 */
export const TRANSACTION_COLUMN_DEFS: Omit<ColumnDef, 'id' | 'key' | 'order'>[] = [
  { name: 'Date', type: 'date', width: 100, editable: true },
  { name: 'Description', type: 'text', width: 250, editable: true },
  { name: 'Amount', type: 'currency', width: 120, editable: true, format: '#,##0.00' },
  { name: 'Reference', type: 'text', width: 120, editable: true },
  { name: 'Status', type: 'dropdown', width: 100, editable: true, options: ['matched', 'suggested', 'pending', 'suspense', 'manual'] },
  { name: 'Confidence', type: 'percentage', width: 100, editable: false, format: '0%' },
]

/**
 * Transaction columns preset
 */
export const TRANSACTION_PRESET: ColumnPreset = {
  id: 'reconciliation-transactions',
  name: 'Bank Transactions',
  description: 'Columns for bank statement transactions',
  category: 'Reconciliation',
  columns: TRANSACTION_COLUMN_DEFS,
}

// =============================================================================
// INVOICE COLUMNS
// =============================================================================

/**
 * Invoice sheet column definitions
 */
export const INVOICE_COLUMN_DEFS: Omit<ColumnDef, 'id' | 'key' | 'order'>[] = [
  { name: 'Invoice #', type: 'text', width: 120, editable: true },
  { name: 'Date', type: 'date', width: 100, editable: true },
  { name: 'Description', type: 'text', width: 250, editable: true },
  { name: 'Amount', type: 'currency', width: 120, editable: true, format: '#,##0.00' },
  { name: 'Due Date', type: 'date', width: 100, editable: true },
  { name: 'Status', type: 'dropdown', width: 100, editable: true, options: ['matched', 'suggested', 'pending', 'suspense', 'manual'] },
  { name: 'Confidence', type: 'percentage', width: 100, editable: false, format: '0%' },
]

/**
 * Invoice columns preset
 */
export const INVOICE_PRESET: ColumnPreset = {
  id: 'reconciliation-invoices',
  name: 'Accrual Documents',
  description: 'Columns for invoices and accrual documents',
  category: 'Reconciliation',
  columns: INVOICE_COLUMN_DEFS,
}

// =============================================================================
// ALL PRESETS
// =============================================================================

/**
 * All reconciliation column presets
 */
export const RECONCILIATION_PRESETS: ColumnPreset[] = [
  TRANSACTION_PRESET,
  INVOICE_PRESET,
]

// =============================================================================
// COLUMN KEY MAPPINGS
// =============================================================================

/**
 * Transaction column keys (for data access)
 */
export const TRANSACTION_KEYS = {
  date: 'col_0',
  description: 'col_1',
  amount: 'col_2',
  reference: 'col_3',
  matchStatus: 'col_4',
  matchConfidence: 'col_5',
} as const

/**
 * Invoice column keys (for data access)
 */
export const INVOICE_KEYS = {
  invoiceNumber: 'col_0',
  date: 'col_1',
  description: 'col_2',
  amount: 'col_3',
  dueDate: 'col_4',
  matchStatus: 'col_5',
  matchConfidence: 'col_6',
} as const

/**
 * Column indices for status and confidence by sheet type
 */
export const COLUMN_INDICES = {
  transactions: {
    status: 4,
    confidence: 5,
  },
  invoices: {
    status: 5,
    confidence: 6,
  },
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate full ColumnDef array from preset
 */
export function createColumnsFromPreset(preset: ColumnPreset): ColumnDef[] {
  return preset.columns.map((col, index) => ({
    ...col,
    id: `col_${index}`,
    key: `col_${index}`,
    order: index,
  }))
}

/**
 * Get status column index for a sheet type
 */
export function getStatusColumnIndex(sheetType: 'transactions' | 'invoices'): number {
  return COLUMN_INDICES[sheetType].status
}

/**
 * Get confidence column index for a sheet type
 */
export function getConfidenceColumnIndex(sheetType: 'transactions' | 'invoices'): number {
  return COLUMN_INDICES[sheetType].confidence
}
