import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { reconciliationModel } from '@/lib/ai/bedrock-provider'
import { MATCHING_REASONING_PROMPT } from '@/lib/ai/prompts'
import { getSession } from '@/lib/auth-server'
import { sanitizeForPrompt, sanitizeNumber } from '@/lib/ai/sanitize'
import { validateCSRF } from '@/lib/csrf'
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit'

export const maxDuration = 60 // Allow longer for complex matching

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  reference?: string
}

interface AccrualDocument {
  id: string
  docDate: string
  description?: string
  amount: number
  docNumber?: string
  counterparty?: string
}

interface MatchingRequest {
  cashTransactions: Transaction[]
  accrualDocuments: AccrualDocument[]
  sessionId: string
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
    // Note: This validates the user has a valid session cookie.
    // For data-modifying operations, Convex mutations enforce ownership.
    // This streaming endpoint is read-only LLM analysis - no data persistence.
    const session = await getSession()
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Rate limiting (5 matching requests per minute - expensive operation)
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(session),
      'matching',
      RateLimits.matching
    )
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many matching requests. Please try again later.' }),
        { status: 429, headers: { ...createRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json() as MatchingRequest
    const { cashTransactions, accrualDocuments, sessionId } = body

    // SECURITY: Validate input arrays
    if (!Array.isArray(cashTransactions) || !Array.isArray(accrualDocuments)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!cashTransactions.length || !accrualDocuments.length) {
      return new Response(
        JSON.stringify({ error: 'No transactions to match' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Limit the number of items to prevent abuse
    // Return error instead of silently truncating - user should know not all items were processed
    const maxItems = 50
    if (cashTransactions.length > maxItems || accrualDocuments.length > maxItems) {
      return new Response(
        JSON.stringify({
          error: `Too many items: maximum ${maxItems} transactions and ${maxItems} documents allowed per request`,
          cashCount: cashTransactions.length,
          accrualCount: accrualDocuments.length,
          maxAllowed: maxItems,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const safeCash = cashTransactions
    const safeAccrual = accrualDocuments

    // Build the matching context with sanitized data
    let prompt = `Session: ${sanitizeForPrompt(sessionId)}\n\n`
    prompt += `You have ${safeCash.length} cash transactions and ${safeAccrual.length} accrual documents to analyze.\n\n`

    prompt += '=== CASH TRANSACTIONS (Bank) ===\n'
    for (const tx of safeCash) {
      const safeDesc = sanitizeForPrompt(tx.description).slice(0, 100)
      const safeRef = tx.reference ? sanitizeForPrompt(tx.reference).slice(0, 50) : ''
      prompt += `[${sanitizeForPrompt(tx.id)}] ${sanitizeForPrompt(tx.date)} | $${sanitizeNumber(tx.amount)} | ${safeDesc}`
      if (safeRef) prompt += ` | Ref: ${safeRef}`
      prompt += '\n'
    }

    prompt += '\n=== ACCRUAL DOCUMENTS (Invoices/Receipts) ===\n'
    for (const doc of safeAccrual) {
      const safeDesc = doc.description ? sanitizeForPrompt(doc.description).slice(0, 100) : ''
      const safeDocNum = doc.docNumber ? sanitizeForPrompt(doc.docNumber).slice(0, 30) : ''
      const safeCounterparty = doc.counterparty ? sanitizeForPrompt(doc.counterparty).slice(0, 50) : ''

      prompt += `[${sanitizeForPrompt(doc.id)}] ${sanitizeForPrompt(doc.docDate)} | $${sanitizeNumber(doc.amount)}`
      if (safeDocNum) prompt += ` | #${safeDocNum}`
      if (safeCounterparty) prompt += ` | ${safeCounterparty}`
      if (safeDesc) prompt += ` | ${safeDesc}`
      prompt += '\n'
    }

    prompt += '\n=== TASK ===\n'
    prompt += 'Analyze these transactions and find potential matches. For each potential match:\n'
    prompt += '1. Explain your reasoning step by step\n'
    prompt += '2. Consider amount, date, and description/reference similarities\n'
    prompt += '3. Assign a confidence score (0-100)\n'
    prompt += '4. Recommend: MATCH, REVIEW, or NO_MATCH\n\n'
    prompt += 'Process each cash transaction and explain your reasoning as you go.'

    const result = streamText({
      model: reconciliationModel,
      system: MATCHING_REASONING_PROMPT,
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Matching stream API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process matching request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
