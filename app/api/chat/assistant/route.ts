import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { NextRequest } from 'next/server'
import { reconciliationModel } from '@/lib/ai/bedrock-provider'
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { buildSafeContextString } from '@/lib/ai/sanitize'
import { getSession } from '@/lib/auth-server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { z } from 'zod'
import { validateCSRF } from '@/lib/csrf'
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit'
import { getAuthedConvexClient } from '@/lib/convex-server'

export const maxDuration = 30

// SECURITY: Maximum messages per request to prevent context exhaustion
const MAX_MESSAGES = 100

interface AssistantContext {
  sessionId?: string
  matches?: Array<{
    id: string
    cashDescription: string
    cashAmount: number
    cashDate: string
    accrualDescription: string
    accrualAmount: number
    accrualDate: string
    confidence: string
    matchLayer: number
    approved: boolean
  }>
  suspenseItems?: Array<{
    id: string
    description: string
    amount: number
    date: string
    reason: string
  }>
  companyName?: string
}

/**
 * Generate explanation for why two transactions were matched
 */
function generateMatchExplanation(
  match: {
    confidenceScore: number
    matchLayer: number
    matchReason?: string
  },
  cash: {
    description: string
    amount: number
    date: string
    reference?: string
  },
  accrual: {
    description?: string
    counterparty?: string
    amount: number
    docDate: string
    docNumber?: string
  }
): string {
  const layerNames: Record<number, string> = {
    1: 'Exact Match',
    2: 'Window Match (delayed payment)',
    3: 'Reference Match',
    4: 'Fuzzy Name Match',
    5: 'AI Semantic Match',
    6: 'Manual Match',
  }

  const layerName = layerNames[match.matchLayer] || `Layer ${match.matchLayer}`
  const amountMatch = Math.abs(cash.amount) === Math.abs(accrual.amount)
  const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount))

  let explanation = `This match was made using **${layerName}** with ${match.confidenceScore}% confidence.\n\n`

  // Add match reason if available
  if (match.matchReason) {
    explanation += `**Reason:** ${match.matchReason}\n\n`
  }

  // Add analysis factors
  explanation += `**Analysis:**\n`
  explanation += `- Amount: ${amountMatch ? 'Exact match' : `Difference of $${amountDiff.toFixed(2)}`}\n`

  // Calculate date difference
  const cashDate = new Date(cash.date)
  const accrualDate = new Date(accrual.docDate)
  const dateDiffDays = Math.abs(
    Math.round((cashDate.getTime() - accrualDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  explanation += `- Date proximity: ${dateDiffDays} days apart\n`

  // Reference match
  if (cash.reference && accrual.docNumber) {
    const refMatch = cash.reference.toLowerCase().includes(accrual.docNumber.toLowerCase())
    explanation += `- Reference: ${refMatch ? 'Document number found in bank reference' : 'No reference match'}\n`
  }

  return explanation
}

/**
 * Calculate date difference in days
 */
function dateDiffDays(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.abs(Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)))
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

    // SECURITY: Rate limiting (20 chat requests per minute)
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

    const body = await req.json()
    const { messages, context } = body as {
      messages: UIMessage[]
      context?: AssistantContext
    }

    // SECURITY: Validate messages array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Limit message array length to prevent memory/context exhaustion
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Too many messages. Maximum is ${MAX_MESSAGES}.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware system prompt with sanitized data
    let systemPrompt = ASSISTANT_SYSTEM_PROMPT

    if (context) {
      systemPrompt += '\n\n--- Current Session Context ---'
      systemPrompt += buildSafeContextString(context)
    }

    const convex = await getAuthedConvexClient()

    const result = streamText({
      model: reconciliationModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        getMatchExplanation: {
          description: 'Get a detailed explanation of why two transactions were matched, including the matching factors and confidence breakdown',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to explain'),
          }),
          execute: async ({ matchId }) => {
            try {
              // Query the match from Convex
              const match = await convex.query(api.matches.get, {
                id: matchId as Id<'matchedPairs'>,
              })

              if (!match) {
                return { error: 'Match not found', matchId }
              }

              // Get the related transactions
              const cashTxn = await convex.query(api.transactions.get, {
                id: match.cashTransactionId,
              })

              const accrualDoc = await convex.query(api.accrualDocuments.get, {
                id: match.accrualDocumentId as Id<'accrualDocuments'>,
              })

              if (!cashTxn || !accrualDoc) {
                return {
                  matchId,
                  error: 'Related transactions not found',
                  layer: match.matchLayer,
                  confidence: match.confidenceScore,
                }
              }

              const explanation = generateMatchExplanation(
                match,
                {
                  description: cashTxn.description,
                  amount: cashTxn.amount,
                  date: cashTxn.date,
                  reference: cashTxn.reference,
                },
                {
                  description: accrualDoc.description,
                  counterparty: accrualDoc.counterparty,
                  amount: accrualDoc.amount,
                  docDate: accrualDoc.docDate,
                  docNumber: accrualDoc.docNumber,
                }
              )

              return {
                matchId,
                layer: match.matchLayer,
                confidence: match.confidenceScore,
                status: match.status,
                explanation,
                factors: {
                  amountMatch: Math.abs(cashTxn.amount) === Math.abs(accrualDoc.amount),
                  amountDifference: Math.abs(Math.abs(cashTxn.amount) - Math.abs(accrualDoc.amount)),
                  dateProximity: dateDiffDays(cashTxn.date, accrualDoc.docDate),
                  referenceMatch: cashTxn.reference?.toLowerCase().includes(
                    accrualDoc.docNumber?.toLowerCase() || ''
                  ) || false,
                },
                cashTransaction: {
                  description: cashTxn.description,
                  amount: cashTxn.amount,
                  date: cashTxn.date,
                },
                accrualDocument: {
                  description: accrualDoc.description || accrualDoc.counterparty,
                  amount: accrualDoc.amount,
                  date: accrualDoc.docDate,
                  docNumber: accrualDoc.docNumber,
                },
              }
            } catch (error) {
              console.error('Error fetching match explanation:', error)
              return {
                matchId,
                error: 'Failed to fetch match details',
              }
            }
          },
        },

        findMatchForSuspense: {
          description: 'Find potential matches for an unmatched (suspense) transaction',
          inputSchema: z.object({
            suspenseItemId: z.string().describe('The ID of the suspense item'),
            maxResults: z.number().optional().default(5).describe('Maximum number of suggestions'),
          }),
          execute: async ({ suspenseItemId, maxResults = 5 }) => {
            try {
              // Get the suspense item
              const suspenseItem = await convex.query(api.suspenseItems.get, {
                id: suspenseItemId as Id<'suspenseItems'>,
              })

              if (!suspenseItem) {
                return { error: 'Suspense item not found', suspenseItemId }
              }

              // Find potential matches based on the suspense item's source type
              let potentialMatches: Array<{
                id: string
                description: string
                amount: number
                date: string
                similarity: number
                reason: string
              }> = []

              if (suspenseItem.sourceType === 'cash') {
                // Look for unmatched accrual documents
                const unmatched = await convex.query(api.accrualDocuments.listBySession, {
                  sessionId: suspenseItem.sessionId,
                  status: 'pending',
                })

                // Score each potential match
                potentialMatches = unmatched
                  .map((doc) => {
                    let score = 0
                    const reasons: string[] = []

                    // Amount similarity
                    const amountDiff = Math.abs(Math.abs(suspenseItem.amount) - Math.abs(doc.amount))
                    const amountPercent = (amountDiff / Math.abs(suspenseItem.amount)) * 100
                    if (amountDiff < 0.01) {
                      score += 40
                      reasons.push('Exact amount match')
                    } else if (amountPercent < 5) {
                      score += 30
                      reasons.push('Amount within 5%')
                    } else if (amountPercent < 10) {
                      score += 20
                      reasons.push('Amount within 10%')
                    }

                    // Date proximity
                    const daysDiff = dateDiffDays(suspenseItem.transactionDate, doc.docDate)
                    if (daysDiff <= 3) {
                      score += 30
                      reasons.push('Same week')
                    } else if (daysDiff <= 7) {
                      score += 20
                      reasons.push('Within 7 days')
                    } else if (daysDiff <= 14) {
                      score += 10
                      reasons.push('Within 14 days')
                    }

                    // Description similarity (basic check)
                    const descLower = suspenseItem.description.toLowerCase()
                    const counterpartyLower = (doc.counterparty || doc.description || '').toLowerCase()
                    if (descLower.includes(counterpartyLower) || counterpartyLower.includes(descLower)) {
                      score += 30
                      reasons.push('Name similarity')
                    }

                    return {
                      id: doc._id,
                      description: doc.counterparty || doc.description || `Doc #${doc.docNumber}`,
                      amount: doc.amount,
                      date: doc.docDate,
                      similarity: Math.min(score, 100),
                      reason: reasons.join(', ') || 'Low confidence',
                    }
                  })
                  .filter((m) => m.similarity > 20)
                  .sort((a, b) => b.similarity - a.similarity)
                  .slice(0, maxResults)
              } else {
                // Look for unmatched cash transactions
                const allCashTxns = await convex.query(api.transactions.listBySession, {
                  sessionId: suspenseItem.sessionId,
                  type: 'cash',
                })
                const unmatched = allCashTxns.filter(txn => txn.status === 'pending')

                // Score each potential match
                potentialMatches = unmatched
                  .map((txn) => {
                    let score = 0
                    const reasons: string[] = []

                    // Amount similarity
                    const amountDiff = Math.abs(Math.abs(suspenseItem.amount) - Math.abs(txn.amount))
                    const amountPercent = (amountDiff / Math.abs(suspenseItem.amount)) * 100
                    if (amountDiff < 0.01) {
                      score += 40
                      reasons.push('Exact amount match')
                    } else if (amountPercent < 5) {
                      score += 30
                      reasons.push('Amount within 5%')
                    } else if (amountPercent < 10) {
                      score += 20
                      reasons.push('Amount within 10%')
                    }

                    // Date proximity
                    const daysDiff = dateDiffDays(suspenseItem.transactionDate, txn.date)
                    if (daysDiff <= 3) {
                      score += 30
                      reasons.push('Same week')
                    } else if (daysDiff <= 7) {
                      score += 20
                      reasons.push('Within 7 days')
                    } else if (daysDiff <= 14) {
                      score += 10
                      reasons.push('Within 14 days')
                    }

                    return {
                      id: txn._id,
                      description: txn.description,
                      amount: txn.amount,
                      date: txn.date,
                      similarity: Math.min(score, 100),
                      reason: reasons.join(', ') || 'Low confidence',
                    }
                  })
                  .filter((m) => m.similarity > 20)
                  .sort((a, b) => b.similarity - a.similarity)
                  .slice(0, maxResults)
              }

              return {
                suspenseItemId,
                suspenseItem: {
                  sourceType: suspenseItem.sourceType,
                  description: suspenseItem.description,
                  amount: suspenseItem.amount,
                  date: suspenseItem.transactionDate,
                  reason: suspenseItem.reason,
                },
                potentialMatches,
                totalFound: potentialMatches.length,
              }
            } catch (error) {
              console.error('Error finding matches for suspense:', error)
              return {
                suspenseItemId,
                error: 'Failed to find potential matches',
                potentialMatches: [],
              }
            }
          },
        },

        approveMatch: {
          description: 'Approve a match between a cash transaction and an accrual document. This confirms the reconciliation.',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to approve'),
            reason: z.string().optional().describe('Optional reason for approval'),
          }),
          execute: async ({ matchId, reason }) => {
            try {
              // Update match status to approved in Convex
              // Note: Convex mutation uses auth context for reviewerId
              await convex.mutation(api.matches.approve, {
                id: matchId as Id<'matchedPairs'>,
              })

              return {
                success: true,
                matchId,
                action: 'approved',
                reason,
                message: `Match ${matchId} has been approved.`,
              }
            } catch (error) {
              console.error('Error approving match:', error)
              return {
                success: false,
                matchId,
                error: 'Failed to approve match. It may have already been processed or does not exist.',
              }
            }
          },
        },

        rejectMatch: {
          description: 'Reject a match and return items to unmatched state. Use this when a match is incorrect.',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to reject'),
            reason: z.string().optional().describe('Optional reason for rejection'),
          }),
          execute: async ({ matchId, reason }) => {
            try {
              // Update match status to rejected in Convex
              // Note: Convex mutation uses auth context for reviewerId
              await convex.mutation(api.matches.reject, {
                id: matchId as Id<'matchedPairs'>,
              })

              return {
                success: true,
                matchId,
                action: 'rejected',
                reason,
                message: `Match ${matchId} has been rejected. Items returned to pending state.`,
              }
            } catch (error) {
              console.error('Error rejecting match:', error)
              return {
                success: false,
                matchId,
                error: 'Failed to reject match. It may have already been processed or does not exist.',
              }
            }
          },
        },

        createManualMatch: {
          description: 'Create a manual match between a cash transaction and an accrual document. Use for suspense items that the AI found good candidates for.',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            cashTransactionId: z.string().describe('The ID of the cash transaction'),
            accrualDocumentId: z.string().describe('The ID of the accrual document'),
            confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the match'),
            reason: z.string().optional().describe('Reason for creating this manual match'),
          }),
          execute: async ({ sessionId, cashTransactionId, accrualDocumentId, confidence, reason }) => {
            try {
              // Create manual match using existing create mutation
              const matchId = await convex.mutation(api.matches.create, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                cashTransactionId: cashTransactionId as Id<'transactions'>,
                accrualDocumentId: accrualDocumentId as Id<'accrualDocuments'>,
                confidence: confidence,
                confidenceScore: confidence === 'high' ? 95 : confidence === 'medium' ? 75 : 55,
                matchLayer: 6, // Layer 6 is manual match
                matchReason: reason || 'AI-assisted manual match',
              })

              return {
                success: true,
                matchId,
                cashTransactionId,
                accrualDocumentId,
                confidence,
                reason,
                message: `Manual match created between ${cashTransactionId} and ${accrualDocumentId}.`,
              }
            } catch (error) {
              console.error('Error creating manual match:', error)
              return {
                success: false,
                error: 'Failed to create manual match. One or both items may already be matched.',
              }
            }
          },
        },

        runMatchingAnalysis: {
          description: 'Run AI-powered matching analysis on pending transactions to find potential matches. This invokes the semantic matching layer.',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            limit: z.number().optional().default(10).describe('Maximum number of transactions to analyze'),
          }),
          execute: async ({ sessionId, limit = 10 }) => {
            try {
              // Get pending transactions
              const cashTxns = await convex.query(api.transactions.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                type: 'cash',
              })
              const pendingCash = cashTxns.filter(t => t.status === 'pending').slice(0, limit)

              const accrualDocs = await convex.query(api.accrualDocuments.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                status: 'pending',
              })
              const pendingAccrual = accrualDocs.slice(0, limit)

              if (pendingCash.length === 0 || pendingAccrual.length === 0) {
                return {
                  success: true,
                  analyzed: 0,
                  message: 'No pending transactions to analyze. Run deterministic matching first or upload more documents.',
                }
              }

              // Perform basic scoring analysis
              const potentialMatches = []
              for (const cash of pendingCash) {
                for (const accrual of pendingAccrual) {
                  let score = 0
                  const factors: string[] = []

                  // Amount similarity
                  const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount))
                  const amountPercent = (amountDiff / Math.abs(cash.amount)) * 100

                  if (amountDiff < 0.01) {
                    score += 40
                    factors.push('Exact amount match')
                  } else if (amountPercent < 5) {
                    score += 30
                    factors.push('Amount within 5%')
                  } else if (amountPercent < 10) {
                    score += 20
                    factors.push('Amount within 10%')
                  }

                  // Date proximity
                  const daysDiff = dateDiffDays(cash.date, accrual.docDate)
                  if (daysDiff <= 3) {
                    score += 30
                    factors.push('Same week')
                  } else if (daysDiff <= 7) {
                    score += 20
                    factors.push('Within 7 days')
                  } else if (daysDiff <= 14) {
                    score += 10
                    factors.push('Within 14 days')
                  }

                  // Description/counterparty similarity
                  const descLower = cash.description.toLowerCase()
                  const counterpartyLower = (accrual.counterparty || accrual.description || '').toLowerCase()
                  if (descLower.includes(counterpartyLower) || counterpartyLower.includes(descLower)) {
                    score += 30
                    factors.push('Name/description similarity')
                  }

                  if (score >= 50) {
                    potentialMatches.push({
                      cashId: cash._id,
                      cashDescription: cash.description,
                      cashAmount: cash.amount,
                      accrualId: accrual._id,
                      accrualDescription: accrual.counterparty || accrual.description,
                      accrualAmount: accrual.amount,
                      score,
                      confidence: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
                      factors,
                    })
                  }
                }
              }

              // Sort by score descending
              potentialMatches.sort((a, b) => b.score - a.score)

              return {
                success: true,
                analyzed: pendingCash.length * pendingAccrual.length,
                pendingCashCount: pendingCash.length,
                pendingAccrualCount: pendingAccrual.length,
                potentialMatches: potentialMatches.slice(0, 10),
                highConfidenceCount: potentialMatches.filter(m => m.confidence === 'high').length,
                message: `Analyzed ${pendingCash.length} cash transactions against ${pendingAccrual.length} accrual documents. Found ${potentialMatches.length} potential matches.`,
              }
            } catch (error) {
              console.error('Error running matching analysis:', error)
              return {
                success: false,
                error: 'Failed to run matching analysis.',
              }
            }
          },
        },

        getExpenseInsights: {
          description: 'Analyze transactions and provide expense insights, patterns, and anomalies',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            dateRange: z.object({
              start: z.string().describe('Start date in ISO format'),
              end: z.string().describe('End date in ISO format'),
            }).optional(),
            category: z.string().optional().describe('Filter by expense category'),
          }),
          execute: async ({ sessionId, dateRange, category }) => {
            try {
              // Get all transactions for the session
              const transactions = await convex.query(api.transactions.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                type: 'cash',
              })

              // Filter by date range if provided
              let filtered = transactions
              if (dateRange) {
                const startDate = new Date(dateRange.start)
                const endDate = new Date(dateRange.end)
                filtered = transactions.filter((t) => {
                  const txnDate = new Date(t.date)
                  return txnDate >= startDate && txnDate <= endDate
                })
              }

              // Filter by category if provided
              if (category) {
                filtered = filtered.filter((t) =>
                  t.category?.toLowerCase() === category.toLowerCase()
                )
              }

              // Calculate insights
              const totalInflows = filtered
                .filter((t) => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0)

              const totalOutflows = filtered
                .filter((t) => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0)

              // Group by category
              const byCategory: Record<string, { count: number; total: number }> = {}
              for (const t of filtered) {
                const cat = t.category || 'Uncategorized'
                if (!byCategory[cat]) {
                  byCategory[cat] = { count: 0, total: 0 }
                }
                byCategory[cat].count++
                byCategory[cat].total += Math.abs(t.amount)
              }

              // Find largest transactions
              const sorted = [...filtered].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
              const largestTransactions = sorted.slice(0, 5).map((t) => ({
                description: t.description,
                amount: t.amount,
                date: t.date,
                category: t.category,
              }))

              // Detect anomalies (transactions > 3x average)
              const avgAmount = filtered.length > 0
                ? filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0) / filtered.length
                : 0
              const anomalies = filtered
                .filter((t) => Math.abs(t.amount) > avgAmount * 3)
                .map((t) => ({
                  description: t.description,
                  amount: t.amount,
                  date: t.date,
                  reason: `${(Math.abs(t.amount) / avgAmount).toFixed(1)}x average`,
                }))

              return {
                sessionId,
                dateRange,
                category,
                summary: {
                  totalTransactions: filtered.length,
                  totalInflows,
                  totalOutflows,
                  netCashflow: totalInflows - totalOutflows,
                  averageTransaction: avgAmount,
                },
                categoryBreakdown: Object.entries(byCategory).map(([name, data]) => ({
                  category: name,
                  count: data.count,
                  total: data.total,
                  percentage: ((data.total / (totalInflows + totalOutflows)) * 100).toFixed(1),
                })),
                largestTransactions,
                anomalies,
                insights: [
                  anomalies.length > 0
                    ? `Found ${anomalies.length} unusual transaction(s) that are significantly larger than average.`
                    : 'No unusual transactions detected.',
                  totalOutflows > totalInflows
                    ? 'Net outflow period - more money going out than coming in.'
                    : 'Net inflow period - positive cash position.',
                ],
              }
            } catch (error) {
              console.error('Error getting expense insights:', error)
              return {
                sessionId,
                error: 'Failed to analyze transactions',
                insights: [],
              }
            }
          },
        },
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Assistant API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
