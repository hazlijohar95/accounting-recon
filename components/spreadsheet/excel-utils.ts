/**
 * Excel import/export utilities using SheetJS
 * For file processing pipelines and report generation
 */

import type { TransactionRow, InvoiceRow, ReconciliationSheetData } from './types'

/**
 * Check if SheetJS is available (lazy load to reduce bundle size)
 */
let XLSX: typeof import('xlsx') | null = null

async function getXLSX() {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}

/**
 * Regex patterns for sheet type detection
 * More robust than simple string includes
 */
const SHEET_PATTERNS = {
  transactions: /^(transaction|bank|cashflow|cash_flow|cash flow|statement|bank_statement)/i,
  invoices: /^(invoice|accrual|payable|receivable|ap|ar|billing)/i,
} as const

/**
 * Test if a sheet name matches the transaction pattern
 */
function isTransactionSheet(name: string): boolean {
  return SHEET_PATTERNS.transactions.test(name)
}

/**
 * Test if a sheet name matches the invoice pattern
 */
function isInvoiceSheet(name: string): boolean {
  return SHEET_PATTERNS.invoices.test(name)
}

/**
 * Parse an uploaded Excel/CSV file into reconciliation data
 */
export async function parseUploadedFile(
  file: File
): Promise<ReconciliationSheetData> {
  const xlsx = await getXLSX()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = xlsx.read(data, { type: 'array' })

        // Look for transactions sheet using regex patterns
        const transactionsSheet = workbook.SheetNames.find(isTransactionSheet)

        // Look for invoices sheet using regex patterns
        const invoicesSheet = workbook.SheetNames.find(isInvoiceSheet)

        const transactions: TransactionRow[] = []
        const invoices: InvoiceRow[] = []

        // Parse transactions
        if (transactionsSheet) {
          const sheet = workbook.Sheets[transactionsSheet]
          const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet)

          rows.forEach((row, index) => {
            transactions.push({
              id: `tx-${index}`,
              date: parseDate(row.Date || row.date || row.DATE),
              description: String(row.Description || row.description || row.DESCRIPTION || row.Narrative || ''),
              amount: parseNumber(row.Amount || row.amount || row.AMOUNT || row.Debit || row.Credit),
              reference: String(row.Reference || row.reference || row.REF || ''),
              matchStatus: 'pending',
            })
          })
        }

        // Parse invoices
        if (invoicesSheet) {
          const sheet = workbook.Sheets[invoicesSheet]
          const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet)

          rows.forEach((row, index) => {
            invoices.push({
              id: `inv-${index}`,
              invoiceNumber: String(row['Invoice Number'] || row.InvoiceNumber || row.invoice_number || row['Invoice #'] || ''),
              date: parseDate(row.Date || row.date || row.DATE || row['Invoice Date']),
              description: String(row.Description || row.description || row.DESCRIPTION || ''),
              amount: parseNumber(row.Amount || row.amount || row.AMOUNT || row.Total),
              dueDate: parseDate(row['Due Date'] || row.DueDate || row.due_date),
              matchStatus: 'pending',
            })
          })
        }

        // If no specific sheets found, try to parse first sheet
        if (transactions.length === 0 && invoices.length === 0 && workbook.SheetNames.length > 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(firstSheet)

          rows.forEach((row, index) => {
            // Try to detect if it's a transaction or invoice based on columns
            const hasInvoiceNumber = row['Invoice Number'] || row.InvoiceNumber || row['Invoice #']

            if (hasInvoiceNumber) {
              invoices.push({
                id: `inv-${index}`,
                invoiceNumber: String(hasInvoiceNumber),
                date: parseDate(row.Date || row.date),
                description: String(row.Description || row.description || ''),
                amount: parseNumber(row.Amount || row.amount || row.Total),
                dueDate: parseDate(row['Due Date'] || row.DueDate),
                matchStatus: 'pending',
              })
            } else {
              transactions.push({
                id: `tx-${index}`,
                date: parseDate(row.Date || row.date),
                description: String(row.Description || row.description || row.Narrative || ''),
                amount: parseNumber(row.Amount || row.amount || row.Debit || row.Credit),
                reference: String(row.Reference || row.reference || ''),
                matchStatus: 'pending',
              })
            }
          })
        }

        resolve({ transactions, invoices })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Export reconciliation data to Excel file
 */
export async function exportToExcel(
  data: ReconciliationSheetData,
  filename: string = 'reconciliation-report.xlsx'
): Promise<Blob> {
  const xlsx = await getXLSX()

  const workbook = xlsx.utils.book_new()

  // Create transactions sheet
  if (data.transactions.length > 0) {
    const txData = data.transactions.map(tx => ({
      Date: tx.date,
      Description: tx.description,
      Amount: tx.amount,
      Reference: tx.reference || '',
      'Match Status': tx.matchStatus,
      'Confidence': tx.matchConfidence ? `${Math.round(tx.matchConfidence * 100)}%` : '',
      'Matched By': tx.matchedBy || '',
    }))

    const txSheet = xlsx.utils.json_to_sheet(txData)
    xlsx.utils.book_append_sheet(workbook, txSheet, 'Transactions')
  }

  // Create invoices sheet
  if (data.invoices.length > 0) {
    const invData = data.invoices.map(inv => ({
      'Invoice #': inv.invoiceNumber,
      Date: inv.date,
      Description: inv.description,
      Amount: inv.amount,
      'Due Date': inv.dueDate || '',
      'Match Status': inv.matchStatus,
      'Confidence': inv.matchConfidence ? `${Math.round(inv.matchConfidence * 100)}%` : '',
      'Matched By': inv.matchedBy || '',
    }))

    const invSheet = xlsx.utils.json_to_sheet(invData)
    xlsx.utils.book_append_sheet(workbook, invSheet, 'Invoices')
  }

  // Generate file
  const buffer = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export and download reconciliation report
 */
export async function downloadReconciliationReport(
  data: ReconciliationSheetData,
  filename?: string
) {
  const blob = await exportToExcel(data, filename)
  downloadBlob(blob, filename || 'reconciliation-report.xlsx')
}

/**
 * Parse various date formats to ISO string
 */
function parseDate(value: unknown): string {
  if (!value) return ''

  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  const str = String(value)
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return str
}

/**
 * Parse various number formats
 */
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (!value) return 0

  const str = String(value).replace(/[,$]/g, '')
  const parsed = parseFloat(str)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Generate CSV string from data
 */
export function toCSV(data: ReconciliationSheetData): string {
  const lines: string[] = []

  // Transactions section
  if (data.transactions.length > 0) {
    lines.push('TRANSACTIONS')
    lines.push('Date,Description,Amount,Reference,Match Status,Confidence')
    data.transactions.forEach(tx => {
      lines.push([
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.amount,
        tx.reference || '',
        tx.matchStatus,
        tx.matchConfidence ? `${Math.round(tx.matchConfidence * 100)}%` : '',
      ].join(','))
    })
    lines.push('')
  }

  // Invoices section
  if (data.invoices.length > 0) {
    lines.push('INVOICES')
    lines.push('Invoice #,Date,Description,Amount,Due Date,Match Status,Confidence')
    data.invoices.forEach(inv => {
      lines.push([
        inv.invoiceNumber,
        inv.date,
        `"${inv.description.replace(/"/g, '""')}"`,
        inv.amount,
        inv.dueDate || '',
        inv.matchStatus,
        inv.matchConfidence ? `${Math.round(inv.matchConfidence * 100)}%` : '',
      ].join(','))
    })
  }

  return lines.join('\n')
}
