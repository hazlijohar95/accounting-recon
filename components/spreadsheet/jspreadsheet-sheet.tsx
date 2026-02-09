'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import jspreadsheet from 'jspreadsheet-ce'
import { cn } from '@/lib/cn'
import type { UniverSheetProps } from './types'
import { TRANSACTION_COLUMNS, INVOICE_COLUMNS } from './constants'
import { getStatusColor, getConfidenceThemeColor } from './theme'
import { formatTransactionData, formatInvoiceData } from './formatters'

// Import jspreadsheet styles
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'

/**
 * Column indices for status and confidence columns by sheet type
 * Extracted for maintainability - update here when column order changes
 */
const COLUMN_INDICES = {
  transactions: { status: 4, confidence: 5 },
  invoices: { status: 5, confidence: 6 },
} as const

// Jspreadsheet instance type
// Using explicit interface since @types/jspreadsheet-ce may not match v5 API exactly
interface JSpreadsheetInstance {
  setData: (data: (string | number)[][]) => void
  setStyle: (cell: string, property: string, value: string) => void
  destroy: () => void
  getStyle: (cell: string) => Record<string, string>
}

/**
 * Convert column index to Excel-style column letter (0 -> A, 1 -> B, etc.)
 */
function columnToLetter(col: number): string {
  let letter = ''
  let temp = col
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * JspreadsheetSheet - A spreadsheet component using Jspreadsheet CE
 * Drop-in replacement for UniverSheet with React 19 compatibility
 *
 * Features:
 * - Full Excel-like spreadsheet functionality
 * - AI match suggestions with visual highlighting
 * - Cell styling for match status and confidence
 * - Dark mode support via CSS variables
 */
export function JspreadsheetSheet({
  data,
  readOnly = false,
  className,
  height = '600px',
}: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const spreadsheetRef = useRef<JSpreadsheetInstance | null>(null)
  const [activeSheet, setActiveSheet] = useState<'transactions' | 'invoices'>('transactions')
  const [isInitialized, setIsInitialized] = useState(false)

  /**
   * Get column configuration for current sheet
   */
  const getColumnsConfig = useCallback((sheetType: 'transactions' | 'invoices') => {
    const columns = sheetType === 'transactions' ? TRANSACTION_COLUMNS : INVOICE_COLUMNS
    return columns.map(col => ({
      title: col.header,
      width: col.width ?? 100,
      type: col.type === 'number' ? 'numeric' as const : 'text' as const,
      readOnly: readOnly || !col.editable,
    }))
  }, [readOnly])

  /**
   * Apply styling to cells based on match status and confidence
   */
  const applyCellStyling = useCallback((
    instance: JSpreadsheetInstance,
    sheetType: 'transactions' | 'invoices'
  ) => {
    if (!data) return

    const rows = sheetType === 'transactions' ? data.transactions : data.invoices
    if (!rows?.length) return

    const { status: statusColIndex, confidence: confidenceColIndex } = COLUMN_INDICES[sheetType]

    rows.forEach((row, rowIndex) => {
      // Style status cell
      const statusColors = getStatusColor(row.matchStatus)
      const statusCell = `${columnToLetter(statusColIndex)}${rowIndex + 1}`
      try {
        instance.setStyle(statusCell, 'background-color', statusColors.bg)
        instance.setStyle(statusCell, 'color', statusColors.text)
      } catch {
        // Ignore styling errors for invalid cells
      }

      // Style confidence cell
      if (row.matchConfidence !== undefined) {
        const confColors = getConfidenceThemeColor(row.matchConfidence)
        const confCell = `${columnToLetter(confidenceColIndex)}${rowIndex + 1}`
        try {
          instance.setStyle(confCell, 'background-color', confColors.bg)
          instance.setStyle(confCell, 'color', confColors.text)
        } catch {
          // Ignore styling errors for invalid cells
        }
      }
    })
  }, [data])

  /**
   * Initialize spreadsheet
   */
  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    // Destroy existing instance
    if (spreadsheetRef.current) {
      try {
        spreadsheetRef.current.destroy()
      } catch {
        // Ignore destruction errors
      }
      spreadsheetRef.current = null
    }

    // Determine initial data based on active sheet
    const sheetData = activeSheet === 'transactions'
      ? formatTransactionData(data?.transactions ?? [])
      : formatInvoiceData(data?.invoices ?? [])

    // Create spreadsheet instance with v5 API (uses worksheets array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = (jspreadsheet as any)(containerRef.current, {
      worksheets: [{
        data: sheetData.length > 0 ? sheetData : [['', '', '', '', '', '']],
        columns: getColumnsConfig(activeSheet),
        minDimensions: [10, 50],
      }],
      tableOverflow: true,
      tableWidth: '100%',
      tableHeight: typeof height === 'number' ? `${height}px` : height,
      editable: !readOnly,
      allowInsertRow: !readOnly,
      allowInsertColumn: false,
      allowDeleteRow: !readOnly,
      allowDeleteColumn: false,
      allowRenameColumn: false,
      columnSorting: true,
      search: true,
      pagination: 50,
      paginationOptions: [10, 25, 50, 100],
      defaultColWidth: 100,
      freezeColumns: 0,
    }) as JSpreadsheetInstance

    spreadsheetRef.current = instance
    setIsInitialized(true)

    // Apply styling after data is loaded
    if (sheetData.length > 0) {
      requestAnimationFrame(() => {
        applyCellStyling(instance, activeSheet)
      })
    }

    return () => {
      if (spreadsheetRef.current) {
        try {
          spreadsheetRef.current.destroy()
        } catch {
          // Ignore destruction errors
        }
        spreadsheetRef.current = null
      }
      setIsInitialized(false)
    }
  }, []) // Intentionally empty - initialization only once

  /**
   * Update data when it changes
   */
  useEffect(() => {
    if (!spreadsheetRef.current || !isInitialized) return

    const sheetData = activeSheet === 'transactions'
      ? formatTransactionData(data?.transactions ?? [])
      : formatInvoiceData(data?.invoices ?? [])

    if (sheetData.length > 0) {
      // Update spreadsheet data
      spreadsheetRef.current.setData(sheetData)

      // Reapply styling
      requestAnimationFrame(() => {
        if (spreadsheetRef.current) {
          applyCellStyling(spreadsheetRef.current, activeSheet)
        }
      })
    }
  }, [data, activeSheet, isInitialized, applyCellStyling])

  /**
   * Switch between transaction and invoice sheets
   */
  const handleSheetSwitch = useCallback((sheet: 'transactions' | 'invoices') => {
    if (sheet === activeSheet || !spreadsheetRef.current) return

    setActiveSheet(sheet)

    // Update columns configuration
    const newColumns = getColumnsConfig(sheet)

    // Get new data
    const newData = sheet === 'transactions'
      ? formatTransactionData(data?.transactions ?? [])
      : formatInvoiceData(data?.invoices ?? [])

    // Destroy and recreate with new configuration
    if (containerRef.current) {
      try {
        spreadsheetRef.current.destroy()
      } catch {
        // Ignore
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = (jspreadsheet as any)(containerRef.current, {
        worksheets: [{
          data: newData.length > 0 ? newData : [['', '', '', '', '', '']],
          columns: newColumns,
          minDimensions: [10, 50],
        }],
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: typeof height === 'number' ? `${height}px` : height,
        editable: !readOnly,
        allowInsertRow: !readOnly,
        allowInsertColumn: false,
        allowDeleteRow: !readOnly,
        allowDeleteColumn: false,
        allowRenameColumn: false,
        columnSorting: true,
        search: true,
        pagination: 50,
        paginationOptions: [10, 25, 50, 100],
      }) as JSpreadsheetInstance

      spreadsheetRef.current = instance

      // Apply styling
      if (newData.length > 0) {
        requestAnimationFrame(() => {
          applyCellStyling(instance, sheet)
        })
      }
    }
  }, [activeSheet, data, getColumnsConfig, applyCellStyling, height, readOnly])

  const hasTransactions = (data?.transactions?.length ?? 0) > 0
  const hasInvoices = (data?.invoices?.length ?? 0) > 0
  const styleMarkup = `
        .jspreadsheet-container .jexcel {
          font-family: inherit;
        }

        .jspreadsheet-container .jexcel_content {
          background-color: var(--background, #ffffff);
        }

        .jspreadsheet-container .jexcel thead td {
          background-color: var(--muted, #f4f4f5);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel tbody td {
          background-color: var(--background, #ffffff);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel tbody td.jexcel_selected,
        .jspreadsheet-container .jexcel tbody td.highlight,
        .jspreadsheet-container .jexcel tbody td.highlight-selected {
          background-color: var(--primary, #3b82f6) !important;
          color: var(--primary-foreground, #ffffff) !important;
        }

        .jspreadsheet-container .jexcel .jexcel_pagination {
          background-color: var(--muted, #f4f4f5);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel .jexcel_pagination select,
        .jspreadsheet-container .jexcel .jexcel_pagination input {
          background-color: var(--background, #ffffff);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        /* Dark mode overrides */
        .dark .jspreadsheet-container .jexcel_content {
          background-color: var(--background, #0a0a0a);
        }

        .dark .jspreadsheet-container .jexcel thead td {
          background-color: var(--muted, #27272a);
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel tbody td {
          background-color: var(--background, #0a0a0a);
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel .jexcel_pagination {
          background-color: var(--muted, #27272a);
        }

        .dark .jspreadsheet-container .jexcel .jexcel_pagination select,
        .dark .jspreadsheet-container .jexcel .jexcel_pagination input {
          background-color: var(--background, #0a0a0a);
          color: var(--foreground, #fafafa);
        }
      `

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border border-border overflow-hidden bg-background',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Sheet tabs */}
      {(hasTransactions || hasInvoices) && (
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => handleSheetSwitch('transactions')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeSheet === 'transactions'
                ? 'bg-background border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            Transactions {hasTransactions && `(${data?.transactions?.length})`}
          </button>
          <button
            onClick={() => handleSheetSwitch('invoices')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeSheet === 'invoices'
                ? 'bg-background border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            Invoices {hasInvoices && `(${data?.invoices?.length})`}
          </button>
        </div>
      )}

      {/* Spreadsheet container */}
      <div
        ref={containerRef}
        className="w-full h-full jspreadsheet-container"
        data-testid="jspreadsheet-sheet"
      />

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading spreadsheet...</span>
          </div>
        </div>
      )}

      {/* Custom styles for dark mode compatibility */}
      {process.env.NODE_ENV === 'test' ? (
        <style>{styleMarkup}</style>
      ) : (
        <style jsx global>{styleMarkup}</style>
      )}
    </div>
  )
}

/**
 * Read-only wrapper for JspreadsheetSheet
 */
export function JspreadsheetSheetReadOnly(props: Omit<UniverSheetProps, 'readOnly'>) {
  return <JspreadsheetSheet {...props} readOnly />
}
