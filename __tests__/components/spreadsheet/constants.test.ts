/**
 * Tests for constants.ts
 */
import { describe, it, expect } from 'vitest'
import {
  formatConfidence,
  getConfidenceColor,
  CONFIDENCE_THRESHOLDS,
  STATUS_COLORS,
  LAYER_COLORS,
  TRANSACTION_COLUMNS,
  INVOICE_COLUMNS,
} from '@/components/spreadsheet/constants'

describe('constants', () => {
  describe('formatConfidence', () => {
    it('formats 0.95 as 95%', () => {
      expect(formatConfidence(0.95)).toBe('95%')
    })

    it('formats 1.0 as 100%', () => {
      expect(formatConfidence(1.0)).toBe('100%')
    })

    it('formats 0 as 0%', () => {
      expect(formatConfidence(0)).toBe('0%')
    })

    it('rounds to nearest integer', () => {
      expect(formatConfidence(0.456)).toBe('46%')
      expect(formatConfidence(0.454)).toBe('45%')
    })
  })

  describe('getConfidenceColor', () => {
    it('returns green for high confidence (>=90%)', () => {
      const result = getConfidenceColor(0.95)
      expect(result.bg).toBe('#dcfce7')
      expect(result.text).toBe('#166534')
    })

    it('returns green for exactly 90%', () => {
      const result = getConfidenceColor(0.90)
      expect(result.bg).toBe('#dcfce7')
    })

    it('returns yellow for medium confidence (70-89%)', () => {
      const result = getConfidenceColor(0.75)
      expect(result.bg).toBe('#fef9c3')
      expect(result.text).toBe('#854d0e')
    })

    it('returns yellow for exactly 70%', () => {
      const result = getConfidenceColor(0.70)
      expect(result.bg).toBe('#fef9c3')
    })

    it('returns red for low confidence (<70%)', () => {
      const result = getConfidenceColor(0.50)
      expect(result.bg).toBe('#fee2e2')
      expect(result.text).toBe('#991b1b')
    })

    it('returns red for 0 confidence', () => {
      const result = getConfidenceColor(0)
      expect(result.bg).toBe('#fee2e2')
    })
  })

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('has correct autoMatch threshold', () => {
      expect(CONFIDENCE_THRESHOLDS.autoMatch).toBe(0.90)
    })

    it('has correct suggest threshold', () => {
      expect(CONFIDENCE_THRESHOLDS.suggest).toBe(0.70)
    })

    it('has correct suspense threshold', () => {
      expect(CONFIDENCE_THRESHOLDS.suspense).toBe(0.70)
    })
  })

  describe('STATUS_COLORS', () => {
    it('has all required statuses', () => {
      expect(STATUS_COLORS).toHaveProperty('matched')
      expect(STATUS_COLORS).toHaveProperty('suggested')
      expect(STATUS_COLORS).toHaveProperty('pending')
      expect(STATUS_COLORS).toHaveProperty('suspense')
      expect(STATUS_COLORS).toHaveProperty('manual')
    })

    it('has bg and text for each status', () => {
      Object.values(STATUS_COLORS).forEach((color) => {
        expect(color).toHaveProperty('bg')
        expect(color).toHaveProperty('text')
        expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i)
        expect(color.text).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('LAYER_COLORS', () => {
    it('has all required layers', () => {
      expect(LAYER_COLORS).toHaveProperty('exact')
      expect(LAYER_COLORS).toHaveProperty('window')
      expect(LAYER_COLORS).toHaveProperty('reference')
      expect(LAYER_COLORS).toHaveProperty('fuzzy')
      expect(LAYER_COLORS).toHaveProperty('semantic')
      expect(LAYER_COLORS).toHaveProperty('manual')
    })

    it('has bg and text for each layer', () => {
      Object.values(LAYER_COLORS).forEach((color) => {
        expect(color).toHaveProperty('bg')
        expect(color).toHaveProperty('text')
        expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i)
        expect(color.text).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('TRANSACTION_COLUMNS', () => {
    it('has the required columns', () => {
      const keys = TRANSACTION_COLUMNS.map((col) => col.key)
      expect(keys).toContain('date')
      expect(keys).toContain('description')
      expect(keys).toContain('amount')
      expect(keys).toContain('matchStatus')
      expect(keys).toContain('matchConfidence')
    })

    it('has headers for all columns', () => {
      TRANSACTION_COLUMNS.forEach((col) => {
        expect(col.header).toBeTruthy()
      })
    })
  })

  describe('INVOICE_COLUMNS', () => {
    it('has the required columns', () => {
      const keys = INVOICE_COLUMNS.map((col) => col.key)
      expect(keys).toContain('invoiceNumber')
      expect(keys).toContain('date')
      expect(keys).toContain('description')
      expect(keys).toContain('amount')
      expect(keys).toContain('matchStatus')
    })

    it('has headers for all columns', () => {
      INVOICE_COLUMNS.forEach((col) => {
        expect(col.header).toBeTruthy()
      })
    })
  })
})
