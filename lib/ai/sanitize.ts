/**
 * Input sanitization utilities for AI prompts
 * Prevents prompt injection attacks by sanitizing user-supplied data
 *
 * Defense strategy: structural delimiters + content normalization + length limits.
 * We normalize unicode confusables and use an allowlist of safe character classes
 * rather than trying to blocklist specific injection phrases (which is trivially bypassable).
 */

// Characters allowed in financial data context (allowlist approach)
// Allows: alphanumeric, basic punctuation, currency symbols, whitespace
const SAFE_CHARS_PATTERN = /[^\p{L}\p{N}\p{Sc}\s.,;:!?'"\-()/@#&+=%*\[\]{}]/gu

/**
 * Normalize unicode confusables that could bypass pattern matching.
 * Maps common lookalike characters to their ASCII equivalents.
 */
function normalizeUnicode(input: string): string {
  return input
    // Normalize to NFC form first
    .normalize('NFC')
    // Map common confusables
    .replace(/[\u0130\u0131]/g, 'i')       // Turkish dotted/dotless i
    .replace(/[\u0410]/g, 'A')              // Cyrillic А → Latin A
    .replace(/[\u0435]/g, 'e')              // Cyrillic е → Latin e
    .replace(/[\u043E]/g, 'o')              // Cyrillic о → Latin o
    .replace(/[\u0440]/g, 'p')              // Cyrillic р → Latin p
    .replace(/[\u0441]/g, 'c')              // Cyrillic с → Latin c
    .replace(/[\u0443]/g, 'y')              // Cyrillic у → Latin y
    .replace(/[\u0455]/g, 's')              // Cyrillic ѕ → Latin s
    .replace(/[\u0456]/g, 'i')              // Cyrillic і → Latin i
    // Fullwidth ASCII variants
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    // Zero-width characters that could be used to split keywords
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '')
}

/**
 * Detect injection-like patterns after normalization.
 * Returns true if the content appears to contain prompt injection attempts.
 */
function containsInjectionPatterns(normalized: string): boolean {
  const lower = normalized.toLowerCase()

  // Structural injection patterns (trying to redefine the AI's behavior)
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|context|prompts?)/,
    /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|context|prompts?)/,
    /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|context|prompts?)/,
    /override\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|context|prompts?)/,
    /you\s+are\s+now\s+(a|an|my)\s+/,
    /new\s+(instructions|role|persona|identity)\s*:/,
    /system\s*prompt\s*:/,
    /\bact\s+as\s+(a|an|if)\b/,
    /\bpretend\s+(to\s+be|you\s+are)\b/,
    /\brole\s*:\s*(system|admin|root)\b/,
    /\b(admin|root|sudo)\s+override\b/,
    // Delimiter injection
    /<<\s*(system|SYS|INST)/,
    /\[INST\]/,
    /\[SYSTEM\]/,
    /```\s*(system|instructions)/,
  ]

  return injectionPatterns.some(pattern => pattern.test(lower))
}

/**
 * Sanitize a string for safe inclusion in AI prompts.
 *
 * Uses a multi-layer approach:
 * 1. Unicode normalization (defeats homoglyph attacks)
 * 2. Structural pattern detection (catches injection attempts)
 * 3. Character allowlisting (removes unexpected characters)
 * 4. Length limiting (prevents context stuffing)
 */
export function sanitizeForPrompt(input: string | undefined | null): string {
  if (!input) return ''

  // Layer 1: Normalize unicode to prevent confusable bypasses
  let sanitized = normalizeUnicode(input)

  // Layer 2: Remove unsafe characters (allowlist approach)
  sanitized = sanitized.replace(SAFE_CHARS_PATTERN, '')

  // Layer 3: Structural sanitization
  sanitized = sanitized
    .replace(/```/g, '`\u200B`\u200B`')  // Break code block delimiters
    .replace(/---/g, '—')                  // Replace markdown separators
    .replace(/\n{3,}/g, '\n\n')            // Limit consecutive newlines

  // Layer 4: Detect and redact injection patterns on normalized text
  if (containsInjectionPatterns(sanitized)) {
    sanitized = '[content filtered - injection pattern detected]'
  }

  // Layer 5: Length limit to prevent context stuffing
  return sanitized.slice(0, 1000).trim()
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
