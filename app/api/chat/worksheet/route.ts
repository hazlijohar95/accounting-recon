import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { NextRequest } from 'next/server'
import { reconciliationModel } from '@/lib/ai/bedrock-provider'
import { buildSystemPrompt, buildWorksheetContext, parseCellReferences, WorksheetContext } from '@/lib/ai/worksheet-context'
import { getSession } from '@/lib/auth-server'
import { validateCSRF } from '@/lib/csrf'
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

export const maxDuration = 30

// SECURITY: Maximum messages per request to prevent context exhaustion
const MAX_MESSAGES = 50

interface WorksheetChatRequest {
  messages: UIMessage[]
  worksheetContext: WorksheetContext
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: CSRF validation
    const csrf = validateCSRF(req)
    if (!csrf.valid) {
      return new Response(
        JSON.stringify({ error: csrf.error }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Require authentication
    const session = await getSession()
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Rate limiting
    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(session),
      'chat',
      RateLimits.chat
    )
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...createRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json() as WorksheetChatRequest
    const { messages, worksheetContext } = body

    // SECURITY: Validate messages array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Limit message array length
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Too many messages. Maximum is ${MAX_MESSAGES}.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate worksheet context
    if (!worksheetContext || !worksheetContext.columns) {
      return new Response(
        JSON.stringify({ error: 'Invalid worksheet context' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build system prompt from worksheet context
    const systemPrompt = buildSystemPrompt(worksheetContext)

    const result = streamText({
      model: reconciliationModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        // Tool: Calculate column statistics
        calculateColumn: {
          description: 'Calculate statistics (sum, average, count, min, max) for a numeric column in the worksheet',
          inputSchema: z.object({
            columnName: z.string().describe('The name of the column to calculate'),
            operation: z.enum(['sum', 'average', 'count', 'min', 'max']).describe('The operation to perform'),
          }),
          execute: async ({ columnName, operation }) => {
            const col = worksheetContext.columns.find(
              c => c.name.toLowerCase() === columnName.toLowerCase()
            )
            if (!col) {
              return { error: `Column "${columnName}" not found`, columns: worksheetContext.columns.map(c => c.name) }
            }

            // Extract values from sample rows
            const values = worksheetContext.sampleRows
              .map(row => {
                const val = row[columnName]
                return typeof val === 'number' ? val : parseFloat(String(val))
              })
              .filter(v => !isNaN(v))

            if (values.length === 0) {
              return {
                columnName,
                operation,
                error: 'No numeric values found in column',
                sampleSize: worksheetContext.sampleRows.length,
              }
            }

            let result: number = 0
            switch (operation) {
              case 'sum':
                result = values.reduce((a, b) => a + b, 0)
                break
              case 'average':
                result = values.reduce((a, b) => a + b, 0) / values.length
                break
              case 'count':
                result = values.length
                break
              case 'min':
                result = Math.min(...values)
                break
              case 'max':
                result = Math.max(...values)
                break
              default:
                result = 0
            }

            return {
              columnName,
              operation,
              result: operation === 'count' ? result : parseFloat(result.toFixed(2)),
              valuesAnalyzed: values.length,
              note: worksheetContext.rowCount > worksheetContext.sampleRows.length
                ? `Calculated from ${values.length} of ${worksheetContext.rowCount} total rows (sample data)`
                : undefined,
            }
          },
        },

        // Tool: Find rows matching criteria
        findRows: {
          description: 'Find rows in the worksheet that match specific criteria',
          inputSchema: z.object({
            columnName: z.string().describe('The column to search'),
            operator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty']).describe('The comparison operator'),
            value: z.string().optional().describe('The value to compare against (not needed for isEmpty/isNotEmpty)'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default 10)'),
          }),
          execute: async ({ columnName, operator, value, maxResults = 10 }) => {
            const col = worksheetContext.columns.find(
              c => c.name.toLowerCase() === columnName.toLowerCase()
            )
            if (!col) {
              return { error: `Column "${columnName}" not found`, columns: worksheetContext.columns.map(c => c.name) }
            }

            const matches: Array<{ rowNumber: number; [key: string]: unknown }> = []

            for (let i = 0; i < worksheetContext.sampleRows.length; i++) {
              const row = worksheetContext.sampleRows[i]
              const cellValue = row[columnName]
              const strValue = cellValue !== null && cellValue !== undefined ? String(cellValue) : ''
              const numValue = parseFloat(strValue)

              let isMatch = false
              switch (operator) {
                case 'equals':
                  isMatch = strValue.toLowerCase() === (value || '').toLowerCase()
                  break
                case 'contains':
                  isMatch = strValue.toLowerCase().includes((value || '').toLowerCase())
                  break
                case 'greaterThan':
                  isMatch = !isNaN(numValue) && numValue > parseFloat(value || '0')
                  break
                case 'lessThan':
                  isMatch = !isNaN(numValue) && numValue < parseFloat(value || '0')
                  break
                case 'isEmpty':
                  isMatch = strValue === ''
                  break
                case 'isNotEmpty':
                  isMatch = strValue !== ''
                  break
              }

              if (isMatch) {
                matches.push({ rowNumber: i + 1, ...row })
                if (matches.length >= maxResults) break
              }
            }

            return {
              query: { columnName, operator, value },
              matchCount: matches.length,
              matches: matches.slice(0, maxResults),
              note: worksheetContext.rowCount > worksheetContext.sampleRows.length
                ? `Searched ${worksheetContext.sampleRows.length} of ${worksheetContext.rowCount} total rows (sample data)`
                : undefined,
            }
          },
        },

        // Tool: Get specific cell value
        getCellValue: {
          description: 'Get the value of a specific cell by row number and column name',
          inputSchema: z.object({
            rowNumber: z.number().describe('The row number (1-indexed)'),
            columnName: z.string().describe('The column name'),
          }),
          execute: async ({ rowNumber, columnName }) => {
            if (rowNumber < 1 || rowNumber > worksheetContext.sampleRows.length) {
              return {
                error: `Row ${rowNumber} not in sample data`,
                availableRows: worksheetContext.sampleRows.length,
                totalRows: worksheetContext.rowCount,
              }
            }

            const col = worksheetContext.columns.find(
              c => c.name.toLowerCase() === columnName.toLowerCase()
            )
            if (!col) {
              return { error: `Column "${columnName}" not found`, columns: worksheetContext.columns.map(c => c.name) }
            }

            const row = worksheetContext.sampleRows[rowNumber - 1]
            const value = row[columnName]

            return {
              rowNumber,
              columnName,
              value: value ?? null,
              type: typeof value,
            }
          },
        },

        // Tool: Get column summary
        getColumnSummary: {
          description: 'Get a summary of all values in a column, including unique values and their counts',
          inputSchema: z.object({
            columnName: z.string().describe('The column name to summarize'),
          }),
          execute: async ({ columnName }) => {
            const col = worksheetContext.columns.find(
              c => c.name.toLowerCase() === columnName.toLowerCase()
            )
            if (!col) {
              return { error: `Column "${columnName}" not found`, columns: worksheetContext.columns.map(c => c.name) }
            }

            const valueCounts: Record<string, number> = {}
            let emptyCount = 0
            let numericCount = 0
            let minValue: number | null = null
            let maxValue: number | null = null
            let sum = 0

            for (const row of worksheetContext.sampleRows) {
              const value = row[columnName]
              const strValue = value !== null && value !== undefined ? String(value) : ''

              if (strValue === '') {
                emptyCount++
              } else {
                valueCounts[strValue] = (valueCounts[strValue] || 0) + 1

                const numValue = parseFloat(strValue)
                if (!isNaN(numValue)) {
                  numericCount++
                  sum += numValue
                  if (minValue === null || numValue < minValue) minValue = numValue
                  if (maxValue === null || numValue > maxValue) maxValue = numValue
                }
              }
            }

            // Sort by count descending and take top 10
            const topValues = Object.entries(valueCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([value, count]) => ({ value, count }))

            return {
              columnName,
              columnType: col.type,
              totalRows: worksheetContext.sampleRows.length,
              emptyCount,
              uniqueValues: Object.keys(valueCounts).length,
              topValues,
              numericStats: numericCount > 0 ? {
                count: numericCount,
                min: minValue,
                max: maxValue,
                sum: parseFloat(sum.toFixed(2)),
                average: parseFloat((sum / numericCount).toFixed(2)),
              } : null,
            }
          },
        },
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Worksheet chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
