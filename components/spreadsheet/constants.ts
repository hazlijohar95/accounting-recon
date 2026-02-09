/**
 * Constants for Univer spreadsheet configuration
 *
 * NOTE: For dynamic theme colors, use theme.ts utilities instead.
 * These static colors are only used as fallbacks or for server-side rendering.
 */

import type { ColumnConfig, MatchStatus, MatchLayer } from './types'
import { getConfidenceThemeColor } from './theme'

/**
 * Column configurations for transactions sheet
 */
export const TRANSACTION_COLUMNS: ColumnConfig[] = [
  { key: 'date', header: 'Date', width: 100, type: 'date', editable: true },
  { key: 'description', header: 'Description', width: 250, type: 'text', editable: true },
  { key: 'amount', header: 'Amount', width: 120, type: 'number', editable: true },
  { key: 'reference', header: 'Reference', width: 120, type: 'text', editable: true },
  { key: 'matchStatus', header: 'Status', width: 100, type: 'status', editable: true },
  { key: 'matchConfidence', header: 'Confidence', width: 100, type: 'confidence', editable: true },
]

/**
 * Column configurations for invoices sheet
 */
export const INVOICE_COLUMNS: ColumnConfig[] = [
  { key: 'invoiceNumber', header: 'Invoice #', width: 120, type: 'text', editable: true },
  { key: 'date', header: 'Date', width: 100, type: 'date', editable: true },
  { key: 'description', header: 'Description', width: 250, type: 'text', editable: true },
  { key: 'amount', header: 'Amount', width: 120, type: 'number', editable: true },
  { key: 'dueDate', header: 'Due Date', width: 100, type: 'date', editable: true },
  { key: 'matchStatus', header: 'Status', width: 100, type: 'status', editable: true },
  { key: 'matchConfidence', header: 'Confidence', width: 100, type: 'confidence', editable: true },
]

/**
 * Static status colors (fallback for SSR or when theme.ts can't access CSS vars)
 * For dynamic theme-aware colors, use getStatusColor() from theme.ts
 */
export const STATUS_COLORS: Record<MatchStatus, { bg: string; text: string }> = {
  matched: { bg: '#dcfce7', text: '#166534' },      // Green
  suggested: { bg: '#fef9c3', text: '#854d0e' },    // Yellow
  pending: { bg: '#f3f4f6', text: '#374151' },      // Gray
  suspense: { bg: '#fee2e2', text: '#991b1b' },     // Red
  manual: { bg: '#dbeafe', text: '#1e40af' },       // Blue
}

/**
 * Static layer badge colors (fallback for SSR or when theme.ts can't access CSS vars)
 * For dynamic theme-aware colors, use getLayerColor() from theme.ts
 */
export const LAYER_COLORS: Record<MatchLayer, { bg: string; text: string }> = {
  exact: { bg: '#dcfce7', text: '#166534' },        // Green
  window: { bg: '#e0f2fe', text: '#0369a1' },       // Sky
  reference: { bg: '#f3e8ff', text: '#7c3aed' },    // Purple
  fuzzy: { bg: '#fef3c7', text: '#b45309' },        // Amber
  semantic: { bg: '#fce7f3', text: '#be185d' },     // Pink
  manual: { bg: '#dbeafe', text: '#1e40af' },       // Blue
  partial: { bg: '#fef3c7', text: '#b45309' },      // Amber (same as fuzzy)
}

/**
 * Default sheet dimensions
 */
export const DEFAULT_SHEET_CONFIG = {
  rowCount: 1000,
  columnCount: 20,
  defaultRowHeight: 24,
  defaultColumnWidth: 100,
  headerRowHeight: 32,
}

/**
 * Confidence thresholds for auto-matching
 */
export const CONFIDENCE_THRESHOLDS = {
  autoMatch: 0.90,    // 90%+ = auto-match
  suggest: 0.70,      // 70-89% = suggest
  suspense: 0.70,     // <70% = suspense
}

/**
 * Format confidence as percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/**
 * Get confidence color based on value (theme-aware)
 * Uses CSS variables for dark mode support
 */
export function getConfidenceColor(confidence: number): { bg: string; text: string } {
  // Use theme-aware color function
  return getConfidenceThemeColor(confidence)
}
