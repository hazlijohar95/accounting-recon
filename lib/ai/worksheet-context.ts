/**
 * Worksheet context utilities for building LLM context from spreadsheet data.
 *
 * @module lib/ai/worksheet-context
 */

import { Doc } from '@/convex/_generated/dataModel'

export interface WorksheetContext {
  worksheetName: string
  columns: Array<{
    name: string
    type: string
    key: string
    hasFormula: boolean
  }>
  rowCount: number
  sampleRows: Array<Record<string, unknown>>
  summary: {
    totalCells: number
    filledCells: number
    formulaColumns: number
  }
  // Sampling metadata for UI warnings
  sampling: {
    isSampled: boolean
    sampleSize: number
    totalRows: number
    samplePercentage: number
  }
}

type WorksheetColumn = Doc<'worksheetColumns'>
type WorksheetRow = Doc<'worksheetRows'>

/**
 * Calculate optimal sample size based on total rows.
 * - For small datasets (≤100 rows): use all rows
 * - For medium datasets (100-500): sample 100 rows
 * - For large datasets (>500): sample 100 rows (same, but warn more prominently)
 */
function calculateSampleSize(totalRows: number, maxOverride?: number): number {
  const DEFAULT_SMALL = 100
  const DEFAULT_LARGE = 100

  if (maxOverride !== undefined) {
    return Math.min(maxOverride, totalRows)
  }

  if (totalRows <= DEFAULT_SMALL) {
    return totalRows // Use all rows for small datasets
  }

  return DEFAULT_LARGE
}

/**
 * Build context object from worksheet data for LLM consumption.
 * Automatically adjusts sample size based on dataset size.
 */
export function buildWorksheetContext(
  worksheetName: string,
  columns: WorksheetColumn[],
  rows: WorksheetRow[],
  maxSampleRows?: number // Optional override (for backwards compatibility)
): WorksheetContext {
  // Sort columns by order
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)

  // Calculate sample size
  const effectiveSampleSize = calculateSampleSize(rows.length, maxSampleRows)

  // Count filled cells and build column info
  let filledCells = 0
  const columnInfos = sortedColumns.map(col => {
    const key = `col_${col.order}`
    return {
      name: col.name,
      type: col.columnType,
      key,
      hasFormula: col.columnType === 'formula',
    }
  })

  // Build sample rows and count filled cells
  const sampleRows = rows.slice(0, effectiveSampleSize).map(row => {
    const rowData: Record<string, unknown> = {}
    for (const col of sortedColumns) {
      const key = `col_${col.order}`
      const value = row.cells[key]
      if (value !== undefined && value !== null && value !== '') {
        filledCells++
      }
      rowData[col.name] = value ?? ''
    }
    return rowData
  })

  // Count total cells in all rows (not just sample)
  const totalCells = columns.length * rows.length

  // Calculate sampling metadata
  const isSampled = effectiveSampleSize < rows.length
  const samplePercentage = rows.length > 0
    ? Math.round((effectiveSampleSize / rows.length) * 100)
    : 100

  return {
    worksheetName,
    columns: columnInfos,
    rowCount: rows.length,
    sampleRows,
    summary: {
      totalCells,
      filledCells,
      formulaColumns: columns.filter(c => c.columnType === 'formula').length,
    },
    sampling: {
      isSampled,
      sampleSize: effectiveSampleSize,
      totalRows: rows.length,
      samplePercentage,
    },
  }
}

/**
 * Format worksheet context as a markdown table for LLM prompt.
 */
export function formatContextAsTable(context: WorksheetContext): string {
  if (context.columns.length === 0 || context.sampleRows.length === 0) {
    return 'No data available.'
  }

  const headers = context.columns.map(c => c.name)
  const headerRow = `| ${headers.join(' | ')} |`
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`

  const dataRows = context.sampleRows.map(row => {
    const cells = headers.map(header => {
      const value = row[header]
      const strValue = value !== null && value !== undefined ? String(value) : ''
      // Escape pipes and truncate long values
      return strValue.replace(/\|/g, '\\|').slice(0, 50)
    })
    return `| ${cells.join(' | ')} |`
  })

  const table = [headerRow, separatorRow, ...dataRows].join('\n')

  // Add note if truncated
  if (context.rowCount > context.sampleRows.length) {
    return `${table}\n\n*Showing ${context.sampleRows.length} of ${context.rowCount} rows*`
  }

  return table
}

/**
 * Build a system prompt for the worksheet chat.
 */
export function buildSystemPrompt(context: WorksheetContext): string {
  const columnList = context.columns
    .map(c => `- ${c.name} (${c.type}${c.hasFormula ? ', AI-enriched' : ''})`)
    .join('\n')

  // Build sampling warning if data is sampled
  const samplingWarning = context.sampling.isSampled
    ? `
⚠️ **IMPORTANT DATA LIMITATION**:
You only have access to ${context.sampling.sampleSize} of ${context.sampling.totalRows} total rows (${context.sampling.samplePercentage}%).
- Any statistics, counts, or aggregations you calculate are based on this SAMPLE ONLY
- You MUST warn the user that your answers are based on a sample, not the full dataset
- For questions like "how many", "average", "total", explicitly state this is from the sample
- If the user asks for analysis of ALL data, explain that you can only analyze the visible sample
`
    : ''

  return `You are an AI assistant helping analyze spreadsheet data.

## Worksheet: "${context.worksheetName}"

### Columns (${context.columns.length}):
${columnList}

### Data Overview:
- Total rows: ${context.rowCount}
- Rows in sample: ${context.sampling.sampleSize}
- Filled cells: ${context.summary.filledCells} of ${context.summary.totalCells}
- AI formula columns: ${context.summary.formulaColumns}
${samplingWarning}
### Sample Data:
${formatContextAsTable(context)}

## Instructions:
- Answer questions about this data clearly and concisely
- When referencing specific data, use format "Row N, Column Name" (e.g., "Row 1, Company Name")
- For calculations, show your work
- ${context.sampling.isSampled ? 'ALWAYS mention that your analysis is based on a sample of the data' : 'If the data is insufficient to answer, say so'}
- Keep responses focused and actionable`
}

/**
 * Parse cell references from AI response text.
 * Looks for patterns like "Row 5, Company" or "Row 12, Revenue"
 */
export function parseCellReferences(
  text: string,
  columns: Array<{ name: string; key: string }>
): Array<{ rowNumber: number; columnKey: string }> {
  const references: Array<{ rowNumber: number; columnKey: string }> = []

  // Pattern: "Row N, ColumnName" or "row N, column name"
  const pattern = /row\s+(\d+),?\s+([a-zA-Z][a-zA-Z0-9\s]*)/gi
  let match

  while ((match = pattern.exec(text)) !== null) {
    const rowNumber = parseInt(match[1], 10)
    const columnNameRaw = match[2].trim().toLowerCase()

    // Find matching column
    const col = columns.find(c => c.name.toLowerCase() === columnNameRaw)
    if (col) {
      references.push({
        rowNumber,
        columnKey: col.key,
      })
    }
  }

  return references
}
