/**
 * Input sanitization utilities for AI prompts
 * Prevents prompt injection attacks by sanitizing user-supplied data
 */

/**
 * Sanitize a string for safe inclusion in AI prompts
 * Escapes special characters and removes potential injection patterns
 */
export function sanitizeForPrompt(input: string | undefined | null): string {
  if (!input) return ''

  return input
    // Remove any attempts to break out of context
    .replace(/```/g, '`\u200B`\u200B`') // Zero-width space to break code blocks
    .replace(/---/g, '—') // Replace markdown separators
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    // Escape common injection patterns
    .replace(/ignore (all )?(previous |prior )?instructions/gi, '[redacted]')
    .replace(/disregard (all )?(previous |prior )?instructions/gi, '[redacted]')
    .replace(/forget (all )?(previous |prior )?(instructions|context)/gi, '[redacted]')
    .replace(/you are now/gi, '[redacted]')
    .replace(/new (instructions|role|persona)/gi, '[filtered]')
    .replace(/system prompt/gi, '[filtered]')
    // Limit length to prevent context stuffing
    .slice(0, 1000)
    .trim()
}

/**
 * Sanitize a number for safe inclusion in prompts
 */
export function sanitizeNumber(input: number | undefined | null): string {
  if (input === undefined || input === null || isNaN(input)) return '0'
  // Format with max 2 decimal places, no locale-specific formatting
  return Number(input).toFixed(2)
}

/**
 * Sanitize an array of items for prompt inclusion
 * Returns a limited, sanitized list
 */
export function sanitizeArray<T>(
  items: T[],
  maxItems: number,
  sanitizer: (item: T) => string
): string[] {
  return items.slice(0, maxItems).map(sanitizer)
}

/**
 * Build a safe context string from user data
 * Used in assistant API route
 */
export function buildSafeContextString(context: {
  companyName?: string
  matches?: Array<{
    id: string
    cashDescription: string
    cashAmount: number
    accrualDescription: string
    accrualAmount: number
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
}): string {
  let contextStr = ''

  if (context.companyName) {
    contextStr += `\nCompany: ${sanitizeForPrompt(context.companyName)}`
  }

  if (context.matches && context.matches.length > 0) {
    contextStr += `\n\nRecent Matches (${Math.min(context.matches.length, 5)} shown):`
    const safeMatches = context.matches.slice(0, 5)
    for (const match of safeMatches) {
      const cashDesc = sanitizeForPrompt(match.cashDescription).slice(0, 50)
      const accrualDesc = sanitizeForPrompt(match.accrualDescription).slice(0, 50)
      contextStr += `\n- ${cashDesc} ↔ ${accrualDesc}`
      contextStr += ` | $${sanitizeNumber(match.cashAmount)} | Layer ${match.matchLayer} | ${match.confidence}`
      contextStr += match.approved ? ' [Approved]' : ' [Pending]'
    }
  }

  if (context.suspenseItems && context.suspenseItems.length > 0) {
    contextStr += `\n\nSuspense Items (${Math.min(context.suspenseItems.length, 5)} shown):`
    const safeItems = context.suspenseItems.slice(0, 5)
    for (const item of safeItems) {
      const desc = sanitizeForPrompt(item.description).slice(0, 50)
      contextStr += `\n- ${desc} | $${sanitizeNumber(item.amount)} | ${sanitizeForPrompt(item.date)}`
    }
  }

  return contextStr
}
