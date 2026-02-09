import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai'
import { NextRequest } from 'next/server'
import { agentModel } from '@/lib/ai/bedrock-provider'
import { AGENTIC_ASSISTANT_PROMPT } from '@/lib/ai/prompts'
import { getSession } from '@/lib/auth-server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { z } from 'zod'
import { validateCSRF } from '@/lib/csrf'
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit'
import { getAuthedConvexClient } from '@/lib/convex-server'
import { sanitizeForPrompt } from '@/lib/ai/sanitize'

export const maxDuration = 60

// SECURITY: Maximum messages per request to prevent context exhaustion
const MAX_MESSAGES = 100

// SECURITY: Maximum request body size (1MB) to prevent memory exhaustion
const MAX_REQUEST_BODY_SIZE = 1 * 1024 * 1024

// SECURITY: Rate limiter for agent mutation tools to prevent rapid-fire prompt injection
// Tracks last mutation timestamp per session — rejects if called faster than 2s apart
const mutationTimestamps = new Map<string, number>()
const MUTATION_COOLDOWN_MS = 2000

function checkMutationRateLimit(sessionKey: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const lastTs = mutationTimestamps.get(sessionKey)
  if (lastTs && now - lastTs < MUTATION_COOLDOWN_MS) {
    return { allowed: false, retryAfterMs: MUTATION_COOLDOWN_MS - (now - lastTs) }
  }
  mutationTimestamps.set(sessionKey, now)
  // Prevent unbounded growth — evict entries older than 60s
  if (mutationTimestamps.size > 1000) {
    const cutoff = now - 60_000
    for (const [key, ts] of mutationTimestamps) {
      if (ts < cutoff) mutationTimestamps.delete(key)
    }
  }
  return { allowed: true }
}

interface AssistantContext {
  sessionId?: string
  companyName?: string
  /** Agent-generated summary from pre-upload analysis (injected into system prompt) */
  agentSummary?: string
}

/**
 * Validate that a string looks like a valid Convex ID.
 * Convex IDs are non-empty alphanumeric strings.
 */
function isValidConvexId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_]+$/.test(id)
}

/**
 * Calculate date difference in days
 */
function dateDiffDays(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.abs(Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * Layer name mapping
 */
const layerNames: Record<number, string> = {
  1: 'Exact Match',
  2: 'Window Match (delayed payment)',
  3: 'Reference Match',
  4: 'Fuzzy Name Match',
  5: 'AI Semantic Match',
  6: 'Manual Match',
  7: 'Partial Match',
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

    // SECURITY: Validate actual request body size before parsing (not Content-Length header which can be omitted/spoofed)
    const bodyText = await req.text()
    if (bodyText.length > MAX_REQUEST_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = JSON.parse(bodyText)
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

    // Build minimal system prompt — agent fetches its own data via tools
    let systemPrompt = AGENTIC_ASSISTANT_PROMPT

    if (context?.sessionId) {
      systemPrompt += `\n\n--- Session Context ---`
      systemPrompt += `\nSession ID: ${sanitizeForPrompt(context.sessionId)}`
      if (context.companyName) {
        systemPrompt += `\nCompany: ${sanitizeForPrompt(context.companyName)}`
      }
    }

    // Inject agent pre-match analysis summary if available
    if (context?.agentSummary) {
      systemPrompt += `\n\n--- Pre-Match Agent Analysis ---`
      systemPrompt += `\nThe upload agent analyzed the documents before reconciliation began. Here is its summary:`
      systemPrompt += `\n${sanitizeForPrompt(context.agentSummary)}`
      systemPrompt += `\nYou can use the getAgentFindings tool to retrieve detailed findings from this analysis.`
    }

    const convex = await getAuthedConvexClient()
    const workosUserId = session.workosId

    const result = streamText({
      model: agentModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(10),
      tools: {
        // ================================================================
        // Category A: Server-Side Query Tools (9)
        // ================================================================

        getMatchExplanation: {
          description: 'Get a detailed explanation of why two transactions were matched, including the matching factors and confidence breakdown',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to explain'),
          }),
          execute: async ({ matchId }) => {
            try {
              if (!isValidConvexId(matchId)) {
                return { error: 'Invalid match ID', matchId }
              }

              const match = await convex.query(api.matches.get, {
                id: matchId as Id<'matchedPairs'>,
                workosUserId,
              })

              if (!match) {
                return { error: 'Match not found', matchId }
              }

              const cashTxn = await convex.query(api.transactions.get, {
                id: match.cashTransactionId,
                workosUserId,
              })

              const accrualDoc = match.accrualDocumentId
                ? await convex.query(api.accrualDocuments.get, {
                    id: match.accrualDocumentId as Id<'accrualDocuments'>,
                    workosUserId,
                  })
                : null

              if (!cashTxn || !accrualDoc) {
                return {
                  matchId,
                  error: 'Related transactions not found',
                  layer: match.matchLayer,
                  layerName: layerNames[match.matchLayer] || `Layer ${match.matchLayer}`,
                  confidence: match.confidenceScore,
                }
              }

              const amountMatch = Math.abs(cashTxn.amount) === Math.abs(accrualDoc.amount)
              const amountDiff = Math.abs(Math.abs(cashTxn.amount) - Math.abs(accrualDoc.amount))
              const dateProximity = dateDiffDays(cashTxn.date, accrualDoc.docDate)
              const refMatch = cashTxn.reference?.toLowerCase().includes(
                accrualDoc.docNumber?.toLowerCase() || ''
              ) || false

              return {
                matchId,
                layer: match.matchLayer,
                layerName: layerNames[match.matchLayer] || `Layer ${match.matchLayer}`,
                confidence: match.confidenceScore,
                confidenceLevel: match.confidence,
                status: match.status,
                matchReason: match.matchReason,
                factors: {
                  amountMatch,
                  amountDifference: amountDiff,
                  dateProximity,
                  referenceMatch: refMatch,
                },
                cashTransaction: {
                  id: cashTxn._id,
                  description: cashTxn.description,
                  amount: cashTxn.amount,
                  date: cashTxn.date,
                  reference: cashTxn.reference,
                },
                accrualDocument: {
                  id: accrualDoc._id,
                  description: accrualDoc.description || accrualDoc.counterparty,
                  amount: accrualDoc.amount,
                  date: accrualDoc.docDate,
                  docNumber: accrualDoc.docNumber,
                  counterparty: accrualDoc.counterparty,
                },
              }
            } catch (error) {
              console.error('Error fetching match explanation:', error instanceof Error ? error.message : 'Unknown error')
              return { matchId, error: 'Failed to fetch match details' }
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
              if (!isValidConvexId(suspenseItemId)) {
                return { error: 'Invalid suspense item ID', suspenseItemId, potentialMatches: [] }
              }

              const suspenseItem = await convex.query(api.suspenseItems.get, {
                id: suspenseItemId as Id<'suspenseItems'>,
                workosUserId,
              })

              if (!suspenseItem) {
                return { error: 'Suspense item not found', suspenseItemId }
              }

              let potentialMatches: Array<{
                id: string
                description: string
                amount: number
                date: string
                similarity: number
                reason: string
              }> = []

              if (suspenseItem.sourceType === 'cash') {
                const unmatched = await convex.query(api.accrualDocuments.listBySession, {
                  sessionId: suspenseItem.sessionId,
                  status: 'pending',
                  workosUserId,
                })

                potentialMatches = unmatched
                  .map((doc) => {
                    let score = 0
                    const reasons: string[] = []

                    const amountDiff = Math.abs(Math.abs(suspenseItem.amount) - Math.abs(doc.amount))
                    const amountPercent = suspenseItem.amount !== 0
                      ? (amountDiff / Math.abs(suspenseItem.amount)) * 100
                      : 100
                    if (amountDiff < 0.01) { score += 40; reasons.push('Exact amount match') }
                    else if (amountPercent < 5) { score += 30; reasons.push('Amount within 5%') }
                    else if (amountPercent < 10) { score += 20; reasons.push('Amount within 10%') }

                    const daysDiff = dateDiffDays(suspenseItem.transactionDate, doc.docDate)
                    if (daysDiff <= 3) { score += 30; reasons.push('Same week') }
                    else if (daysDiff <= 7) { score += 20; reasons.push('Within 7 days') }
                    else if (daysDiff <= 14) { score += 10; reasons.push('Within 14 days') }

                    const descLower = suspenseItem.description.toLowerCase()
                    const counterpartyLower = (doc.counterparty || doc.description || '').toLowerCase()
                    if (descLower.includes(counterpartyLower) || counterpartyLower.includes(descLower)) {
                      score += 30; reasons.push('Name similarity')
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
                const allCashTxns = await convex.query(api.transactions.listBySession, {
                  sessionId: suspenseItem.sessionId,
                  type: 'cash',
                  workosUserId,
                })
                const unmatched = allCashTxns.filter(txn => txn.status === 'pending')

                potentialMatches = unmatched
                  .map((txn) => {
                    let score = 0
                    const reasons: string[] = []

                    const amountDiff = Math.abs(Math.abs(suspenseItem.amount) - Math.abs(txn.amount))
                    const amountPercent = suspenseItem.amount !== 0
                      ? (amountDiff / Math.abs(suspenseItem.amount)) * 100
                      : 100
                    if (amountDiff < 0.01) { score += 40; reasons.push('Exact amount match') }
                    else if (amountPercent < 5) { score += 30; reasons.push('Amount within 5%') }
                    else if (amountPercent < 10) { score += 20; reasons.push('Amount within 10%') }

                    const daysDiff = dateDiffDays(suspenseItem.transactionDate, txn.date)
                    if (daysDiff <= 3) { score += 30; reasons.push('Same week') }
                    else if (daysDiff <= 7) { score += 20; reasons.push('Within 7 days') }
                    else if (daysDiff <= 14) { score += 10; reasons.push('Within 14 days') }

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
              console.error('Error finding matches for suspense:', error instanceof Error ? error.message : 'Unknown error')
              return { suspenseItemId, error: 'Failed to find potential matches', potentialMatches: [] }
            }
          },
        },

        runMatchingAnalysis: {
          description: 'Run AI-powered matching analysis on pending transactions to find potential matches',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            limit: z.number().optional().default(10).describe('Maximum number of transactions to analyze'),
          }),
          execute: async ({ sessionId, limit = 10 }) => {
            try {
              if (!isValidConvexId(sessionId)) {
                return { success: false, error: 'Invalid session ID' }
              }

              const cashTxns = await convex.query(api.transactions.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                type: 'cash',
                workosUserId,
              })
              const pendingCash = cashTxns.filter(t => t.status === 'pending').slice(0, limit)

              const accrualDocs = await convex.query(api.accrualDocuments.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                status: 'pending',
                workosUserId,
              })
              const pendingAccrual = accrualDocs.slice(0, limit)

              if (pendingCash.length === 0 || pendingAccrual.length === 0) {
                return {
                  success: true,
                  analyzed: 0,
                  message: 'No pending transactions to analyze. Run deterministic matching first or upload more documents.',
                }
              }

              const potentialMatches = []
              for (const cash of pendingCash) {
                for (const accrual of pendingAccrual) {
                  let score = 0
                  const factors: string[] = []

                  const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount))
                  const amountPercent = cash.amount !== 0
                    ? (amountDiff / Math.abs(cash.amount)) * 100
                    : 100

                  if (amountDiff < 0.01) { score += 40; factors.push('Exact amount match') }
                  else if (amountPercent < 5) { score += 30; factors.push('Amount within 5%') }
                  else if (amountPercent < 10) { score += 20; factors.push('Amount within 10%') }

                  const daysDiff = dateDiffDays(cash.date, accrual.docDate)
                  if (daysDiff <= 3) { score += 30; factors.push('Same week') }
                  else if (daysDiff <= 7) { score += 20; factors.push('Within 7 days') }
                  else if (daysDiff <= 14) { score += 10; factors.push('Within 14 days') }

                  const descLower = cash.description.toLowerCase()
                  const counterpartyLower = (accrual.counterparty || accrual.description || '').toLowerCase()
                  if (descLower.includes(counterpartyLower) || counterpartyLower.includes(descLower)) {
                    score += 30; factors.push('Name/description similarity')
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
              console.error('Error running matching analysis:', error instanceof Error ? error.message : 'Unknown error')
              return { success: false, error: 'Failed to run matching analysis.' }
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
              if (!isValidConvexId(sessionId)) {
                return { sessionId, error: 'Invalid session ID' }
              }

              const transactions = await convex.query(api.transactions.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                type: 'cash',
                workosUserId,
              })

              let filtered = transactions
              if (dateRange) {
                const startDate = new Date(dateRange.start)
                const endDate = new Date(dateRange.end)
                filtered = transactions.filter((t) => {
                  const txnDate = new Date(t.date)
                  return txnDate >= startDate && txnDate <= endDate
                })
              }

              if (category) {
                filtered = filtered.filter((t) =>
                  t.category?.toLowerCase() === category.toLowerCase()
                )
              }

              const totalInflows = filtered.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
              const totalOutflows = filtered.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

              const byCategory: Record<string, { count: number; total: number }> = {}
              for (const t of filtered) {
                const cat = t.category || 'Uncategorized'
                if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 }
                byCategory[cat].count++
                byCategory[cat].total += Math.abs(t.amount)
              }

              const sorted = [...filtered].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
              const largestTransactions = sorted.slice(0, 5).map((t) => ({
                description: t.description,
                amount: t.amount,
                date: t.date,
                category: t.category,
              }))

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
                  percentage: totalInflows + totalOutflows > 0
                    ? ((data.total / (totalInflows + totalOutflows)) * 100).toFixed(1)
                    : '0',
                })),
                largestTransactions,
                anomalies,
              }
            } catch (error) {
              console.error('Error getting expense insights:', error instanceof Error ? error.message : 'Unknown error')
              return { sessionId, error: 'Failed to analyze transactions' }
            }
          },
        },

        listTransactions: {
          description: 'List and filter cash or accrual transactions for the current session. Use this to answer questions about specific transactions.',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            type: z.enum(['cash', 'accrual']).optional().describe('Filter by transaction type'),
            status: z.enum(['pending', 'matched', 'suspense']).optional().describe('Filter by status'),
            minAmount: z.number().optional().describe('Minimum absolute amount'),
            maxAmount: z.number().optional().describe('Maximum absolute amount'),
            dateFrom: z.string().optional().describe('Start date (ISO format)'),
            dateTo: z.string().optional().describe('End date (ISO format)'),
            descriptionSearch: z.string().optional().describe('Search term for description/counterparty'),
            limit: z.number().optional().default(20).describe('Max results to return'),
          }),
          execute: async ({ sessionId, type, status, minAmount, maxAmount, dateFrom, dateTo, descriptionSearch, limit = 20 }) => {
            try {
              if (!isValidConvexId(sessionId)) {
                return { error: 'Invalid session ID', transactions: [] }
              }

              const clampedLimit = Math.min(limit, 50) // Cap at 50 to prevent unbounded queries
              const sid = sessionId as Id<'reconciliationSessions'>

              // Fetch both types or a specific one
              let results: Array<{
                id: string
                type: string
                description: string
                amount: number
                date: string
                status: string
                reference?: string
                category?: string
                counterparty?: string
                docNumber?: string
              }> = []

              if (!type || type === 'cash') {
                const cashTxns = await convex.query(api.transactions.listBySession, {
                  sessionId: sid,
                  type: 'cash',
                  workosUserId,
                })
                for (const t of cashTxns) {
                  results.push({
                    id: t._id,
                    type: 'cash',
                    description: t.description,
                    amount: t.amount,
                    date: t.date,
                    status: t.status,
                    reference: t.reference,
                    category: t.category,
                  })
                }
              }

              if (!type || type === 'accrual') {
                const accrualDocs = await convex.query(api.accrualDocuments.listBySession, {
                  sessionId: sid,
                  workosUserId,
                })
                for (const d of accrualDocs) {
                  results.push({
                    id: d._id,
                    type: 'accrual',
                    description: d.description || d.counterparty || `Doc #${d.docNumber}`,
                    amount: d.amount,
                    date: d.docDate,
                    status: d.status,
                    counterparty: d.counterparty,
                    docNumber: d.docNumber,
                  })
                }
              }

              // Apply filters
              if (status) {
                results = results.filter(r => r.status === status)
              }
              if (minAmount !== undefined) {
                results = results.filter(r => Math.abs(r.amount) >= minAmount)
              }
              if (maxAmount !== undefined) {
                results = results.filter(r => Math.abs(r.amount) <= maxAmount)
              }
              if (dateFrom) {
                results = results.filter(r => r.date >= dateFrom)
              }
              if (dateTo) {
                results = results.filter(r => r.date <= dateTo)
              }
              if (descriptionSearch) {
                const search = descriptionSearch.toLowerCase()
                results = results.filter(r =>
                  r.description.toLowerCase().includes(search) ||
                  (r.counterparty?.toLowerCase().includes(search)) ||
                  (r.reference?.toLowerCase().includes(search)) ||
                  (r.docNumber?.toLowerCase().includes(search))
                )
              }

              return {
                transactions: results.slice(0, clampedLimit),
                totalFound: results.length,
                truncated: results.length > clampedLimit,
              }
            } catch (error) {
              console.error('Error listing transactions:', error instanceof Error ? error.message : 'Unknown error')
              return { error: 'Failed to list transactions', transactions: [] }
            }
          },
        },

        listSuspenseItems: {
          description: 'List unmatched (suspense) items for the current session',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            status: z.enum(['open', 'queried', 'resolved']).optional().describe('Filter by suspense status'),
            limit: z.number().optional().default(20).describe('Max results to return'),
          }),
          execute: async ({ sessionId, status, limit = 20 }) => {
            try {
              if (!isValidConvexId(sessionId)) {
                return { error: 'Invalid session ID', items: [] }
              }

              const clampedLimit = Math.min(limit, 50)
              const items = await convex.query(api.suspenseItems.listBySession, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                status: status as 'open' | 'queried' | 'resolved' | undefined,
                workosUserId,
              })

              return {
                items: items.slice(0, clampedLimit).map(item => ({
                  id: item._id,
                  sourceType: item.sourceType,
                  description: item.description,
                  amount: item.amount,
                  date: item.transactionDate,
                  reason: item.reason,
                  suggestedAction: item.suggestedAction,
                  status: item.status,
                })),
                totalFound: items.length,
                truncated: items.length > clampedLimit,
              }
            } catch (error) {
              console.error('Error listing suspense items:', error instanceof Error ? error.message : 'Unknown error')
              return { error: 'Failed to list suspense items', items: [] }
            }
          },
        },

        getAgentFindings: {
          description: 'Get pre-upload agent analysis findings for this reconciliation session. Call this when the user asks about document issues, upload warnings, pre-match analysis, or data quality concerns that were detected before reconciliation began.',
          inputSchema: z.object({
            sessionId: z.string().optional().describe('The reconciliation session ID. Falls back to the current session context if not provided.'),
          }),
          execute: async ({ sessionId: inputSessionId }) => {
            try {
              // Use explicit input if provided, fall back to context
              const sessionIdStr = inputSessionId || context?.sessionId
              if (!sessionIdStr || !isValidConvexId(sessionIdStr)) {
                return { error: 'No session context available', findings: [] }
              }

              const sid = sessionIdStr as Id<'reconciliationSessions'>

              // Get the linked agent session
              const agentSession = await convex.query(api.agentSession.getForReconciliation, {
                reconciliationSessionId: sid,
                workosUserId,
              })

              if (!agentSession) {
                return {
                  hasAgentContext: false,
                  message: 'No upload agent analysis is linked to this reconciliation session.',
                  findings: [],
                }
              }

              // Get unresolved findings
              const findings = await convex.query(api.agentEngine.getFindingsForReconciliation, {
                reconciliationSessionId: sid,
                workosUserId,
              })

              return {
                hasAgentContext: true,
                sessionStatus: agentSession.status,
                summary: agentSession.summary || null,
                totalFindings: findings.length,
                findings: findings.map((f: Record<string, unknown>) => ({
                  type: f.type,
                  severity: f.severity,
                  title: f.title,
                  description: f.description,
                  status: f.status,
                  relatedDocumentIds: f.relatedDocumentIds || [],
                  relatedTransactionIds: f.relatedTransactionIds || [],
                })),
              }
            } catch (error) {
              console.error('getAgentFindings error:', error)
              return { error: 'Failed to retrieve agent findings', findings: [] }
            }
          },
        },

        getSessionStats: {
          description: 'Get reconciliation session statistics: counts, totals, variance, and progress',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
          }),
          execute: async ({ sessionId }) => {
            try {
              if (!isValidConvexId(sessionId)) {
                return { error: 'Invalid session ID', sessionId }
              }

              const sid = sessionId as Id<'reconciliationSessions'>

              // Fetch session details
              const sessionData = await convex.query(api.sessions.get, {
                id: sid,
                workosUserId,
              })

              if (!sessionData) {
                return { error: 'Session not found', sessionId }
              }

              // Fetch match counts
              const matchCounts = await convex.query(api.matches.getCounts, {
                sessionId: sid,
                workosUserId,
              })

              // Fetch suspense counts
              const suspenseCounts = await convex.query(api.suspenseItems.getCounts, {
                sessionId: sid,
                workosUserId,
              })

              // Fetch transaction totals
              const cashTxns = await convex.query(api.transactions.listBySession, {
                sessionId: sid,
                type: 'cash',
                workosUserId,
              })
              const accrualDocs = await convex.query(api.accrualDocuments.listBySession, {
                sessionId: sid,
                workosUserId,
              })

              const totalCashAmount = cashTxns.reduce((sum, t) => sum + t.amount, 0)
              const totalAccrualAmount = accrualDocs.reduce((sum, d) => sum + d.amount, 0)

              const pendingCash = cashTxns.filter(t => t.status === 'pending').length
              const matchedCash = cashTxns.filter(t => t.status === 'matched').length
              const pendingAccrual = accrualDocs.filter(d => d.status === 'pending').length
              const matchedAccrual = accrualDocs.filter(d => d.status === 'matched').length

              return {
                sessionId,
                sessionName: sessionData.name,
                sessionStatus: sessionData.status,
                progress: sessionData.progress,
                counts: {
                  totalCashTransactions: cashTxns.length,
                  totalAccrualDocuments: accrualDocs.length,
                  pendingCash,
                  matchedCash,
                  pendingAccrual,
                  matchedAccrual,
                  matches: matchCounts,
                  suspense: suspenseCounts,
                },
                totals: {
                  cashAmount: totalCashAmount,
                  accrualAmount: totalAccrualAmount,
                  variance: totalCashAmount - totalAccrualAmount,
                },
              }
            } catch (error) {
              console.error('Error getting session stats:', error instanceof Error ? error.message : 'Unknown error')
              return { sessionId, error: 'Failed to get session statistics' }
            }
          },
        },

        getMatchDetails: {
          description: 'Get details of specific match(es) by their IDs',
          inputSchema: z.object({
            matchIds: z.array(z.string()).describe('Array of match IDs to retrieve details for'),
          }),
          execute: async ({ matchIds }) => {
            try {
              const validIds = matchIds.filter(isValidConvexId).slice(0, 10)
              if (validIds.length === 0) {
                return { error: 'No valid match IDs provided', matches: [] }
              }

              const details = []
              for (const matchId of validIds) {
                try {
                  const match = await convex.query(api.matches.get, {
                    id: matchId as Id<'matchedPairs'>,
                    workosUserId,
                  })
                  if (match) {
                    const cashTxn = await convex.query(api.transactions.get, {
                      id: match.cashTransactionId,
                      workosUserId,
                    })
                    const accrualDoc = match.accrualDocumentId
                      ? await convex.query(api.accrualDocuments.get, {
                          id: match.accrualDocumentId as Id<'accrualDocuments'>,
                          workosUserId,
                        })
                      : null

                    details.push({
                      matchId,
                      layer: match.matchLayer,
                      layerName: layerNames[match.matchLayer] || `Layer ${match.matchLayer}`,
                      confidence: match.confidenceScore,
                      confidenceLevel: match.confidence,
                      status: match.status,
                      matchReason: match.matchReason,
                      isPartialMatch: match.isPartialMatch,
                      matchedAmount: match.matchedAmount,
                      cashTransaction: cashTxn ? {
                        id: cashTxn._id,
                        description: cashTxn.description,
                        amount: cashTxn.amount,
                        date: cashTxn.date,
                      } : null,
                      accrualDocument: accrualDoc ? {
                        id: accrualDoc._id,
                        description: accrualDoc.description || accrualDoc.counterparty,
                        amount: accrualDoc.amount,
                        date: accrualDoc.docDate,
                        docNumber: accrualDoc.docNumber,
                      } : null,
                    })
                  }
                } catch {
                  details.push({ matchId, error: 'Not found or access denied' })
                }
              }
              return { matches: details }
            } catch (error) {
              console.error('Error getting match details:', error instanceof Error ? error.message : 'Unknown error')
              return { error: 'Failed to get match details', matches: [] }
            }
          },
        },

        // ================================================================
        // Category B: Client-Side Confirmation (1) — NO execute
        // ================================================================

        askForConfirmation: {
          description: 'Ask the user for confirmation before performing any mutation (approve, reject, create match, bulk operations). This pauses execution and shows a confirmation card in the UI. ALWAYS use this before any mutation.',
          inputSchema: z.object({
            action: z.enum([
              'approve_match',
              'reject_match',
              'create_manual_match',
              'bulk_approve',
              'bulk_reject',
            ]).describe('The type of action to confirm'),
            title: z.string().describe('Short title for the confirmation card'),
            description: z.string().describe('Detailed description of what will happen'),
            details: z.record(z.string(), z.unknown()).optional().describe('Additional details to display'),
            affectedCount: z.number().optional().describe('Number of items affected'),
          }),
          // NO execute function — this is a client-side tool
        },

        // ================================================================
        // Category C: Server-Side Mutation Tools (4)
        // ================================================================

        approveMatch: {
          description: 'Approve a single match. Only call this AFTER the user has confirmed via askForConfirmation.',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to approve'),
          }),
          execute: async ({ matchId }) => {
            try {
              // SECURITY: Mutation rate limiting to prevent rapid-fire prompt injection
              const rateCheck = checkMutationRateLimit(`${workosUserId}:mutation`)
              if (!rateCheck.allowed) {
                return { success: false, matchId, error: `Mutation rate limited. Please wait ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s before the next action.` }
              }

              if (!isValidConvexId(matchId)) {
                return { success: false, matchId, error: 'Invalid match ID' }
              }

              await convex.mutation(api.matches.approve, {
                id: matchId as Id<'matchedPairs'>,
                workosUserId,
              })
              return {
                success: true,
                matchId,
                action: 'approved',
                message: `Match ${matchId} has been approved.`,
              }
            } catch (error) {
              console.error('Error approving match:', error instanceof Error ? error.message : 'Unknown error')
              return {
                success: false,
                matchId,
                error: 'Failed to approve match. It may have already been processed.',
              }
            }
          },
        },

        rejectMatch: {
          description: 'Reject a single match. Only call this AFTER the user has confirmed via askForConfirmation.',
          inputSchema: z.object({
            matchId: z.string().describe('The ID of the match to reject'),
          }),
          execute: async ({ matchId }) => {
            try {
              // SECURITY: Mutation rate limiting to prevent rapid-fire prompt injection
              const rateCheck = checkMutationRateLimit(`${workosUserId}:mutation`)
              if (!rateCheck.allowed) {
                return { success: false, matchId, error: `Mutation rate limited. Please wait ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s before the next action.` }
              }

              if (!isValidConvexId(matchId)) {
                return { success: false, matchId, error: 'Invalid match ID' }
              }

              await convex.mutation(api.matches.reject, {
                id: matchId as Id<'matchedPairs'>,
                workosUserId,
              })
              return {
                success: true,
                matchId,
                action: 'rejected',
                message: `Match ${matchId} has been rejected. Items returned to pending.`,
              }
            } catch (error) {
              console.error('Error rejecting match:', error instanceof Error ? error.message : 'Unknown error')
              return {
                success: false,
                matchId,
                error: 'Failed to reject match. It may have already been processed.',
              }
            }
          },
        },

        createManualMatch: {
          description: 'Create a manual match between a cash transaction and an accrual document. Only call this AFTER the user has confirmed via askForConfirmation.',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
            cashTransactionId: z.string().describe('The ID of the cash transaction'),
            accrualDocumentId: z.string().describe('The ID of the accrual document'),
            confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level'),
            reason: z.string().optional().describe('Reason for creating this match'),
          }),
          execute: async ({ sessionId, cashTransactionId, accrualDocumentId, confidence, reason }) => {
            try {
              // SECURITY: Mutation rate limiting to prevent rapid-fire prompt injection
              const rateCheck = checkMutationRateLimit(`${workosUserId}:mutation`)
              if (!rateCheck.allowed) {
                return { success: false, error: `Mutation rate limited. Please wait ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s before the next action.` }
              }

              if (!isValidConvexId(sessionId) || !isValidConvexId(cashTransactionId) || !isValidConvexId(accrualDocumentId)) {
                return { success: false, error: 'Invalid ID provided' }
              }

              const matchId = await convex.mutation(api.matches.create, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                cashTransactionId: cashTransactionId as Id<'transactions'>,
                accrualDocumentId: accrualDocumentId as Id<'accrualDocuments'>,
                confidence,
                confidenceScore: confidence === 'high' ? 95 : confidence === 'medium' ? 75 : 55,
                matchLayer: 6 as const,
                matchReason: reason || 'AI-assisted manual match',
                workosUserId,
              })
              return {
                success: true,
                matchId,
                cashTransactionId,
                accrualDocumentId,
                message: `Manual match created successfully.`,
              }
            } catch (error) {
              console.error('Error creating manual match:', error instanceof Error ? error.message : 'Unknown error')
              return {
                success: false,
                error: 'Failed to create manual match. Items may already be matched.',
              }
            }
          },
        },

        bulkApproveMatches: {
          description: 'Approve all high-confidence pending matches in the session. Only call this AFTER the user has confirmed via askForConfirmation.',
          inputSchema: z.object({
            sessionId: z.string().describe('The reconciliation session ID'),
          }),
          execute: async ({ sessionId }) => {
            try {
              // SECURITY: Mutation rate limiting to prevent rapid-fire prompt injection
              const rateCheck = checkMutationRateLimit(`${workosUserId}:mutation`)
              if (!rateCheck.allowed) {
                return { success: false, sessionId, error: `Mutation rate limited. Please wait ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s before the next action.` }
              }

              if (!isValidConvexId(sessionId)) {
                return { success: false, sessionId, error: 'Invalid session ID' }
              }

              const result = await convex.mutation(api.matches.approveHighConfidence, {
                sessionId: sessionId as Id<'reconciliationSessions'>,
                workosUserId,
              })
              return {
                success: true,
                sessionId,
                action: 'bulk_approved',
                result,
                message: 'High-confidence matches have been approved.',
              }
            } catch (error) {
              console.error('Error bulk approving matches:', error instanceof Error ? error.message : 'Unknown error')
              return {
                success: false,
                sessionId,
                error: 'Failed to bulk approve matches.',
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
