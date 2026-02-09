/**
 * Tests for excel-utils.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toCSV } from '@/components/spreadsheet/excel-utils'
import type { ReconciliationSheetData } from '@/components/spreadsheet/types'

describe('excel-utils', () => {
  describe('toCSV', () => {
    it('generates CSV with transactions only', () => {
      const data: ReconciliationSheetData = {
        transactions: [
          {
            id: 'tx-1',
            date: '2024-01-15',
            description: 'Payment from Acme',
            amount: 1000.50,
            reference: 'REF-001',
            matchStatus: 'matched',
            matchConfidence: 0.95,
          },
        ],
        invoices: [],
      }

      const csv = toCSV(data)

      expect(csv).toContain('TRANSACTIONS')
      expect(csv).toContain('Date,Description,Amount,Reference,Match Status,Confidence')
      expect(csv).toContain('2024-01-15')
      expect(csv).toContain('"Payment from Acme"')
      expect(csv).toContain('1000.5')
      expect(csv).toContain('REF-001')
      expect(csv).toContain('matched')
      expect(csv).toContain('95%')
    })

    it('generates CSV with invoices only', () => {
      const data: ReconciliationSheetData = {
        transactions: [],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            date: '2024-01-10',
            description: 'Consulting services',
            amount: 2500.00,
            dueDate: '2024-02-10',
            matchStatus: 'pending',
          },
        ],
      }

      const csv = toCSV(data)

      expect(csv).toContain('INVOICES')
      expect(csv).toContain('Invoice #,Date,Description,Amount,Due Date,Match Status,Confidence')
      expect(csv).toContain('INV-001')
      expect(csv).toContain('2024-01-10')
      expect(csv).toContain('"Consulting services"')
      expect(csv).toContain('2500')
      expect(csv).toContain('2024-02-10')
      expect(csv).toContain('pending')
    })

    it('generates CSV with both transactions and invoices', () => {
      const data: ReconciliationSheetData = {
        transactions: [
          {
            id: 'tx-1',
            date: '2024-01-15',
            description: 'Payment',
            amount: 1000,
            matchStatus: 'matched',
          },
        ],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            date: '2024-01-10',
            description: 'Service',
            amount: 1000,
            matchStatus: 'matched',
          },
        ],
      }

      const csv = toCSV(data)

      expect(csv).toContain('TRANSACTIONS')
      expect(csv).toContain('INVOICES')
    })

    it('handles empty data gracefully', () => {
      const data: ReconciliationSheetData = {
        transactions: [],
        invoices: [],
      }

      const csv = toCSV(data)

      expect(csv).toBe('')
    })

    it('escapes double quotes in descriptions', () => {
      const data: ReconciliationSheetData = {
        transactions: [
          {
            id: 'tx-1',
            date: '2024-01-15',
            description: 'Payment for "special" services',
            amount: 1000,
            matchStatus: 'pending',
          },
        ],
        invoices: [],
      }

      const csv = toCSV(data)

      expect(csv).toContain('"Payment for ""special"" services"')
    })

    it('handles missing optional fields', () => {
      const data: ReconciliationSheetData = {
        transactions: [
          {
            id: 'tx-1',
            date: '2024-01-15',
            description: 'Payment',
            amount: 1000,
            matchStatus: 'pending',
            // reference and matchConfidence are undefined
          },
        ],
        invoices: [],
      }

      const csv = toCSV(data)

      // Should not throw and should have empty values for missing fields
      expect(csv).toContain('2024-01-15')
      expect(csv).toContain('pending')
    })
  })
})
