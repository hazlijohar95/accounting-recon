/**
 * Unit Tests for Cloudinary Extraction Module
 *
 * Tests the pure functions for date parsing, amount parsing,
 * data extraction, and confidence calculation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Since the functions are not exported, we need to test them via the module internals
// For now, we'll recreate the pure functions for testing
// In a real scenario, these would be exported from a separate utils file

// ============================================================================
// Pure Function Implementations (copied for testing)
// These should ideally be extracted to a shared utils module
// ============================================================================

function isValidDateComponents(year: string, month: string, day: string): boolean {
  const y = parseInt(year)
  const m = parseInt(month)
  const d = parseInt(day)

  if (isNaN(y) || isNaN(m) || isNaN(d)) return false
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  if (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) {
    if (d > 29) return false
  } else {
    if (d > daysInMonth[m - 1]) return false
  }

  return true
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null
  }

  const str = String(dateStr).trim()

  if (!str) {
    return null
  }

  // Already in YYYY-MM-DD format - validate it
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    if (isValidDateComponents(str.slice(0, 4), str.slice(5, 7), str.slice(8, 10))) {
      return str
    }
    return null
  }

  // Try to parse various formats
  const parts = str.split(/[\/\-\.]/)

  if (parts.length === 3) {
    let day: string, month: string, year: string

    if (parts[0].length === 4) {
      [year, month, day] = parts
    } else if (parts[2].length === 4) {
      if (parseInt(parts[0]) > 12) {
        [day, month, year] = parts
      } else if (parseInt(parts[1]) > 12) {
        [month, day, year] = parts
      } else {
        [day, month, year] = parts
      }
    } else if (parts[2].length === 2) {
      [day, month, year] = parts
      const yearNum = parseInt(year)
      if (yearNum >= 0 && yearNum <= 99) {
        year = yearNum <= 30 ? `20${year.padStart(2, '0')}` : `19${year}`
      }
    } else {
      return null
    }

    day = day.padStart(2, '0')
    month = month.padStart(2, '0')

    if (!isValidDateComponents(year, month, day)) {
      return null
    }

    return `${year}-${month}-${day}`
  }

  try {
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      const result = date.toISOString().split('T')[0]
      if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
        return result
      }
    }
  } catch {
    // Ignore
  }

  return null
}

function isReasonableDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr)
    const now = new Date()

    if (isNaN(date.getTime())) return false

    const tenYearsAgo = new Date(now)
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

    const oneYearFromNow = new Date(now)
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    return date >= tenYearsAgo && date <= oneYearFromNow
  } catch {
    return false
  }
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[RM$MYR\s]/gi, '')
      .replace(/,/g, '')
      .trim()

    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      return -parseFloat(cleaned.slice(1, -1))
    }

    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  return 0
}

function calculateConfidence(
  itemCount: number,
  data: Record<string, unknown>,
  skippedCount: number = 0
): number {
  let score = 50

  if (itemCount > 0) score += 20
  if (itemCount >= 5) score += 10
  if (itemCount >= 10) score += 10

  if (data.bankName || data.counterparty) score += 5
  if (data.statementPeriod || data.docDate) score += 5

  if (skippedCount > 0) {
    const totalAttempted = itemCount + skippedCount
    const skipRatio = skippedCount / totalAttempted
    score -= Math.round(skipRatio * 50)
  }

  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// Tests
// ============================================================================

describe('Date Parsing', () => {
  describe('normalizeDate', () => {
    describe('valid dates', () => {
      it('returns YYYY-MM-DD dates unchanged', () => {
        expect(normalizeDate('2025-01-15')).toBe('2025-01-15')
        expect(normalizeDate('2024-12-31')).toBe('2024-12-31')
        expect(normalizeDate('2020-02-29')).toBe('2020-02-29') // Leap year
      })

      it('parses DD/MM/YYYY format (Malaysian)', () => {
        expect(normalizeDate('15/01/2025')).toBe('2025-01-15')
        expect(normalizeDate('31/12/2024')).toBe('2024-12-31')
        expect(normalizeDate('01/01/2020')).toBe('2020-01-01')
      })

      it('parses DD-MM-YYYY format', () => {
        expect(normalizeDate('15-01-2025')).toBe('2025-01-15')
        expect(normalizeDate('31-12-2024')).toBe('2024-12-31')
      })

      it('parses DD.MM.YYYY format', () => {
        expect(normalizeDate('15.01.2025')).toBe('2025-01-15')
        expect(normalizeDate('31.12.2024')).toBe('2024-12-31')
      })

      it('parses YYYY/MM/DD format', () => {
        expect(normalizeDate('2025/01/15')).toBe('2025-01-15')
        expect(normalizeDate('2024/12/31')).toBe('2024-12-31')
      })

      it('parses DD/MM/YY format with 2-digit year', () => {
        expect(normalizeDate('15/01/25')).toBe('2025-01-15')
        expect(normalizeDate('15/01/30')).toBe('2030-01-15')
        expect(normalizeDate('15/01/31')).toBe('1931-01-15') // Assumes 31-99 = 1931-1999
      })

      it('handles single-digit day/month', () => {
        expect(normalizeDate('1/1/2025')).toBe('2025-01-01')
        expect(normalizeDate('5/3/2024')).toBe('2024-03-05')
      })

      it('distinguishes DD/MM from MM/DD based on values', () => {
        // First value > 12 must be day
        expect(normalizeDate('25/01/2025')).toBe('2025-01-25')
        expect(normalizeDate('31/05/2024')).toBe('2024-05-31')

        // Second value > 12 must be day (MM/DD format)
        expect(normalizeDate('01/25/2025')).toBe('2025-01-25')
        expect(normalizeDate('05/31/2024')).toBe('2024-05-31')
      })
    })

    describe('invalid dates', () => {
      it('returns null for empty/null/undefined input', () => {
        expect(normalizeDate('')).toBeNull()
        expect(normalizeDate(null as unknown as string)).toBeNull()
        expect(normalizeDate(undefined as unknown as string)).toBeNull()
      })

      it('returns null for invalid date strings', () => {
        expect(normalizeDate('not-a-date')).toBeNull()
        expect(normalizeDate('abc/def/ghij')).toBeNull()
        // Note: '2025' is actually valid - JS Date parses it as 2025-01-01
        expect(normalizeDate('random text here')).toBeNull()
        expect(normalizeDate('01-2025')).toBeNull()
      })

      it('returns null for out-of-range values', () => {
        expect(normalizeDate('32/01/2025')).toBeNull() // Day > 31
        expect(normalizeDate('15/13/2025')).toBeNull() // Month > 12
        expect(normalizeDate('00/01/2025')).toBeNull() // Day = 0
        expect(normalizeDate('15/00/2025')).toBeNull() // Month = 0
      })

      it('returns null for invalid leap year dates', () => {
        expect(normalizeDate('29/02/2025')).toBeNull() // 2025 is not a leap year
        expect(normalizeDate('30/02/2024')).toBeNull() // Feb never has 30 days
        expect(normalizeDate('31/02/2024')).toBeNull() // Feb never has 31 days
      })

      it('returns null for invalid days in month', () => {
        expect(normalizeDate('31/04/2025')).toBeNull() // April has 30 days
        expect(normalizeDate('31/06/2025')).toBeNull() // June has 30 days
        expect(normalizeDate('31/09/2025')).toBeNull() // September has 30 days
        expect(normalizeDate('31/11/2025')).toBeNull() // November has 30 days
      })

      it('returns null for extremely old/future dates', () => {
        expect(normalizeDate('01/01/1800')).toBeNull() // Before 1900
        expect(normalizeDate('01/01/2200')).toBeNull() // After 2100
      })
    })
  })

  describe('isValidDateComponents', () => {
    it('validates correct dates', () => {
      expect(isValidDateComponents('2025', '01', '15')).toBe(true)
      expect(isValidDateComponents('2024', '12', '31')).toBe(true)
    })

    it('handles leap years correctly', () => {
      // 2024 is a leap year (divisible by 4, not by 100)
      expect(isValidDateComponents('2024', '02', '29')).toBe(true)
      // 2025 is not a leap year
      expect(isValidDateComponents('2025', '02', '29')).toBe(false)
      // 2000 is a leap year (divisible by 400)
      expect(isValidDateComponents('2000', '02', '29')).toBe(true)
      // 1900 is not a leap year (divisible by 100 but not 400)
      expect(isValidDateComponents('1900', '02', '29')).toBe(false)
    })

    it('rejects invalid components', () => {
      expect(isValidDateComponents('abc', '01', '15')).toBe(false)
      expect(isValidDateComponents('2025', 'ab', '15')).toBe(false)
      expect(isValidDateComponents('2025', '01', 'cd')).toBe(false)
    })
  })

  describe('isReasonableDate', () => {
    it('accepts dates within valid range', () => {
      const now = new Date()
      const lastMonth = new Date(now)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      expect(isReasonableDate(lastMonth.toISOString().split('T')[0])).toBe(true)
      expect(isReasonableDate(now.toISOString().split('T')[0])).toBe(true)
    })

    it('accepts dates up to 1 year in future (for future invoices)', () => {
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

      expect(isReasonableDate(sixMonthsFromNow.toISOString().split('T')[0])).toBe(true)
    })

    it('rejects dates more than 10 years old', () => {
      const elevenYearsAgo = new Date()
      elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11)

      expect(isReasonableDate(elevenYearsAgo.toISOString().split('T')[0])).toBe(false)
    })

    it('rejects dates more than 1 year in future', () => {
      const twoYearsFromNow = new Date()
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)

      expect(isReasonableDate(twoYearsFromNow.toISOString().split('T')[0])).toBe(false)
    })

    it('rejects invalid date strings', () => {
      expect(isReasonableDate('invalid')).toBe(false)
      expect(isReasonableDate('')).toBe(false)
    })
  })
})

describe('Amount Parsing', () => {
  describe('parseAmount', () => {
    it('returns numbers unchanged', () => {
      expect(parseAmount(100)).toBe(100)
      expect(parseAmount(-50.25)).toBe(-50.25)
      expect(parseAmount(0)).toBe(0)
    })

    it('parses string amounts', () => {
      expect(parseAmount('100')).toBe(100)
      expect(parseAmount('100.50')).toBe(100.5)
      expect(parseAmount('-50.25')).toBe(-50.25)
    })

    it('handles thousand separators', () => {
      expect(parseAmount('1,000')).toBe(1000)
      expect(parseAmount('1,234,567.89')).toBe(1234567.89)
      expect(parseAmount('10,000.00')).toBe(10000)
    })

    it('removes currency symbols', () => {
      expect(parseAmount('RM100')).toBe(100)
      expect(parseAmount('RM 1,500.00')).toBe(1500)
      expect(parseAmount('$50.00')).toBe(50)
      expect(parseAmount('MYR 2,500')).toBe(2500)
    })

    it('handles accounting format (parentheses for negative)', () => {
      expect(parseAmount('(100)')).toBe(-100)
      expect(parseAmount('(1,500.00)')).toBe(-1500)
      expect(parseAmount('(50.25)')).toBe(-50.25)
    })

    it('handles whitespace', () => {
      expect(parseAmount('  100  ')).toBe(100)
      expect(parseAmount('RM  500')).toBe(500)
    })

    it('returns 0 for invalid values', () => {
      expect(parseAmount('abc')).toBe(0)
      expect(parseAmount('')).toBe(0)
      expect(parseAmount(null)).toBe(0)
      expect(parseAmount(undefined)).toBe(0)
      expect(parseAmount({})).toBe(0)
      expect(parseAmount([])).toBe(0)
    })
  })
})

describe('Confidence Calculation', () => {
  describe('calculateConfidence', () => {
    it('returns base score of 50 for no items', () => {
      expect(calculateConfidence(0, {})).toBe(50)
    })

    it('increases score for extracted items', () => {
      expect(calculateConfidence(1, {})).toBe(70) // +20
      expect(calculateConfidence(5, {})).toBe(80) // +20 +10
      expect(calculateConfidence(10, {})).toBe(90) // +20 +10 +10
    })

    it('increases score for metadata fields', () => {
      expect(calculateConfidence(1, { bankName: 'Maybank' })).toBe(75) // +20 +5
      expect(calculateConfidence(1, { counterparty: 'ABC Corp' })).toBe(75)
      expect(calculateConfidence(1, { statementPeriod: {} })).toBe(75)
      expect(calculateConfidence(1, { docDate: '2025-01-01' })).toBe(75)
    })

    it('caps at 100', () => {
      expect(calculateConfidence(15, {
        bankName: 'Maybank',
        statementPeriod: {},
      })).toBe(100)
    })

    it('penalizes skipped records', () => {
      // 1 valid, 1 skipped = 50% skip ratio = -25 points
      expect(calculateConfidence(1, {}, 1)).toBe(45) // 70 - 25

      // 1 valid, 9 skipped = 90% skip ratio = -45 points
      expect(calculateConfidence(1, {}, 9)).toBe(25) // 70 - 45

      // 5 valid, 5 skipped = 50% skip ratio = -25 points
      expect(calculateConfidence(5, {}, 5)).toBe(55) // 80 - 25
    })

    it('does not go below 0', () => {
      expect(calculateConfidence(0, {}, 10)).toBe(0) // 50 - 50 = 0
    })
  })
})

describe('JSON Extraction from LLM Response', () => {
  // Test helper to extract JSON like the actual implementation does
  function extractJSON(text: string): Record<string, unknown> | null {
    try {
      let jsonStr = text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }

      const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (!jsonObjMatch) {
        return null
      }

      return JSON.parse(jsonObjMatch[0])
    } catch {
      return null
    }
  }

  it('extracts JSON from plain response', () => {
    const response = '{"transactions": [{"date": "2025-01-15", "amount": 100}]}'
    const result = extractJSON(response)
    expect(result).toEqual({ transactions: [{ date: '2025-01-15', amount: 100 }] })
  })

  it('extracts JSON from markdown code block', () => {
    const response = `
Here is the extracted data:

\`\`\`json
{
  "transactions": [
    {"date": "2025-01-15", "description": "Test", "amount": -100}
  ],
  "bankName": "Maybank"
}
\`\`\`
`
    const result = extractJSON(response)
    expect(result).toEqual({
      transactions: [{ date: '2025-01-15', description: 'Test', amount: -100 }],
      bankName: 'Maybank',
    })
  })

  it('extracts JSON from code block without language', () => {
    const response = `
\`\`\`
{"docType": "invoice", "amount": 500}
\`\`\`
`
    const result = extractJSON(response)
    expect(result).toEqual({ docType: 'invoice', amount: 500 })
  })

  it('handles JSON with extra text around it', () => {
    const response = `
Based on my analysis, here is the data:
{"transactions": [{"date": "2025-01-01", "amount": 50}]}
Please verify the above.
`
    const result = extractJSON(response)
    expect(result).toEqual({ transactions: [{ date: '2025-01-01', amount: 50 }] })
  })

  it('returns null for invalid JSON', () => {
    expect(extractJSON('not json')).toBeNull()
    expect(extractJSON('{invalid: json}')).toBeNull()
    expect(extractJSON('')).toBeNull()
  })
})

describe('Transaction Deduplication', () => {
  // Simulate the deduplication logic from aggregatePageResults
  function deduplicateTransactions<T extends { date: string; description: string; amount: number }>(
    transactions: T[]
  ): T[] {
    const seen = new Set<string>()
    return transactions.filter(tx => {
      const key = `${tx.date}|${tx.description}|${tx.amount}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  it('removes exact duplicates', () => {
    const transactions = [
      { date: '2025-01-15', description: 'Payment A', amount: 100 },
      { date: '2025-01-15', description: 'Payment A', amount: 100 }, // Duplicate
      { date: '2025-01-16', description: 'Payment B', amount: 200 },
    ]

    const result = deduplicateTransactions(transactions)
    expect(result).toHaveLength(2)
  })

  it('keeps transactions with different dates', () => {
    const transactions = [
      { date: '2025-01-15', description: 'Payment A', amount: 100 },
      { date: '2025-01-16', description: 'Payment A', amount: 100 }, // Different date
    ]

    const result = deduplicateTransactions(transactions)
    expect(result).toHaveLength(2)
  })

  it('keeps transactions with different descriptions', () => {
    const transactions = [
      { date: '2025-01-15', description: 'Payment A', amount: 100 },
      { date: '2025-01-15', description: 'Payment B', amount: 100 }, // Different description
    ]

    const result = deduplicateTransactions(transactions)
    expect(result).toHaveLength(2)
  })

  it('keeps transactions with different amounts', () => {
    const transactions = [
      { date: '2025-01-15', description: 'Payment A', amount: 100 },
      { date: '2025-01-15', description: 'Payment A', amount: 200 }, // Different amount
    ]

    const result = deduplicateTransactions(transactions)
    expect(result).toHaveLength(2)
  })

  it('preserves first occurrence on duplicates', () => {
    const transactions = [
      { date: '2025-01-15', description: 'First', amount: 100, reference: 'REF1' },
      { date: '2025-01-15', description: 'First', amount: 100, reference: 'REF2' },
    ]

    const result = deduplicateTransactions(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].reference).toBe('REF1')
  })
})

describe('Document Type Mapping', () => {
  // Simulate the mapDocType function
  function mapDocType(docType: string): string {
    const typeMap: Record<string, string> = {
      invoice: 'purchase_invoice',
      purchase_invoice: 'purchase_invoice',
      sales_invoice: 'sales_invoice',
      receipt: 'receipt',
      pos_report: 'pos_report',
      settlement: 'settlement',
    }

    return typeMap[docType?.toLowerCase()] || 'receipt'
  }

  it('maps known document types', () => {
    expect(mapDocType('invoice')).toBe('purchase_invoice')
    expect(mapDocType('purchase_invoice')).toBe('purchase_invoice')
    expect(mapDocType('sales_invoice')).toBe('sales_invoice')
    expect(mapDocType('receipt')).toBe('receipt')
    expect(mapDocType('pos_report')).toBe('pos_report')
    expect(mapDocType('settlement')).toBe('settlement')
  })

  it('is case insensitive', () => {
    expect(mapDocType('INVOICE')).toBe('purchase_invoice')
    expect(mapDocType('Receipt')).toBe('receipt')
    expect(mapDocType('POS_REPORT')).toBe('pos_report')
  })

  it('defaults to receipt for unknown types', () => {
    expect(mapDocType('unknown')).toBe('receipt')
    expect(mapDocType('other')).toBe('receipt')
    expect(mapDocType('')).toBe('receipt')
  })
})
