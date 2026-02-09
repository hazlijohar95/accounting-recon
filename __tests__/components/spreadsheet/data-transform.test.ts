/**
 * Tests for data-transform utilities
 */
import { describe, it, expect } from 'vitest'
import {
  transformToSpreadsheetData,
  transformTransaction,
  transformAccrualDocument,
} from '@/components/spreadsheet/data-transform'
import type { MatchPair, Transaction, SuspenseItem, AccrualDocument } from '@/lib/store'

// Factory functions for test data
function createTestTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    date: '2024-01-15',
    description: 'Test payment',
    amount: 1000,
    type: 'cash',
    status: 'matched',
    ...overrides,
  }
}

function createTestAccrualDocument(overrides: Partial<AccrualDocument> = {}): AccrualDocument {
  return {
    id: 'ad1',
    docType: 'sales_invoice',
    docNumber: 'INV-001',
    docDate: '2024-01-10',
    amount: 1000,
    status: 'matched',
    ...overrides,
  }
}

function createTestMatch(overrides: Partial<MatchPair> = {}): MatchPair {
  return {
    id: 'm1',
    cashTransaction: createTestTransaction(),
    accrualTransaction: createTestTransaction({
      id: 'tx2',
      date: '2024-01-10',
      description: 'Test invoice',
      type: 'accrual',
    }),
    confidence: 'high',
    confidenceScore: 95,
    matchLayer: 1,
    approved: true,
    ...overrides,
  }
}

function createTestSuspenseItem(overrides: Partial<SuspenseItem> = {}): SuspenseItem {
  return {
    id: 'si1',
    sourceType: 'cash',
    sourceId: 'tx2',
    amount: 500,
    transactionDate: '2024-01-20',
    description: 'Unknown payment',
    reason: 'no_match',
    suggestedAction: 'Review',
    status: 'open',
    ...overrides,
  }
}

describe('data-transform', () => {
  describe('transformToSpreadsheetData', () => {
    it('transforms matches to transactions and invoices', () => {
      const matches = [createTestMatch()]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions).toHaveLength(1)
      expect(result.invoices).toHaveLength(1)
    })

    it('sets correct matchStatus for approved matches', () => {
      const matches = [createTestMatch({ approved: true })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchStatus).toBe('matched')
    })

    it('sets correct matchStatus for unapproved high-confidence matches', () => {
      const matches = [createTestMatch({ approved: false, confidenceScore: 95 })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchStatus).toBe('suggested')
    })

    it('sets correct matchStatus for unapproved medium-confidence matches', () => {
      const matches = [createTestMatch({ approved: false, confidenceScore: 75 })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchStatus).toBe('suggested')
    })

    it('sets correct matchStatus for unapproved low-confidence matches', () => {
      const matches = [createTestMatch({ approved: false, confidenceScore: 50 })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchStatus).toBe('suspense')
    })

    it('converts matchLayer number to layer name', () => {
      const matches = [createTestMatch({ matchLayer: 1 })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchedBy).toBe('exact')
    })

    it('handles all match layers correctly', () => {
      const layerMap: Record<number, string> = {
        1: 'exact',
        2: 'window',
        3: 'reference',
        4: 'fuzzy',
        5: 'semantic',
        6: 'manual',
        7: 'partial',
      }

      Object.entries(layerMap).forEach(([num, name]) => {
        const matches = [createTestMatch({ matchLayer: Number(num) as 1|2|3|4|5|6|7 })]
        const result = transformToSpreadsheetData(matches, [])
        expect(result.transactions[0].matchedBy).toBe(name)
      })
    })

    it('adds suspense items as unmatched transactions', () => {
      const suspenseItems = [createTestSuspenseItem()]

      const result = transformToSpreadsheetData([], suspenseItems)

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].matchStatus).toBe('suspense')
    })

    it('handles empty arrays', () => {
      const result = transformToSpreadsheetData([], [])

      expect(result.transactions).toEqual([])
      expect(result.invoices).toEqual([])
    })

    it('handles matches with accrualDocument', () => {
      const matches = [createTestMatch({
        accrualDocument: createTestAccrualDocument(),
      })]

      const result = transformToSpreadsheetData(matches, [])

      expect(result.invoices[0].invoiceNumber).toBe('INV-001')
    })

    it('correctly converts confidence score to decimal', () => {
      const matches = [createTestMatch({ confidenceScore: 85 })]
      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchConfidence).toBe(0.85)
    })

    it('preserves transaction data correctly', () => {
      const tx = createTestTransaction({
        id: 'test-tx',
        date: '2024-03-15',
        description: 'Test Description',
        amount: 1234.56,
      })
      const matches = [createTestMatch({ cashTransaction: tx })]

      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].id).toBe('test-tx')
      expect(result.transactions[0].date).toBe('2024-03-15')
      expect(result.transactions[0].description).toBe('Test Description')
      expect(result.transactions[0].amount).toBe(1234.56)
    })

    it('handles mixed matches and suspense items', () => {
      const matches = [createTestMatch()]
      const suspenseItems = [createTestSuspenseItem()]

      const result = transformToSpreadsheetData(matches, suspenseItems)

      expect(result.transactions).toHaveLength(2)
      expect(result.invoices).toHaveLength(1)
    })

    it('sets matchedInvoiceId from accrualDocument', () => {
      const matches = [createTestMatch({
        accrualDocument: createTestAccrualDocument({ id: 'doc-123' }),
      })]

      const result = transformToSpreadsheetData(matches, [])

      expect(result.transactions[0].matchedInvoiceId).toBe('doc-123')
    })

    it('handles Transaction type in suspenseItems array', () => {
      const unmatchedTx: Transaction = createTestTransaction({
        id: 'unmatched-tx',
        status: 'suspense',
      })

      const result = transformToSpreadsheetData([], [unmatchedTx])

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].id).toBe('unmatched-tx')
      expect(result.transactions[0].matchStatus).toBe('suspense')
    })

    it('handles Transaction with pending status in suspenseItems', () => {
      const pendingTx: Transaction = createTestTransaction({
        id: 'pending-tx',
        status: 'pending',
      })

      const result = transformToSpreadsheetData([], [pendingTx])

      expect(result.transactions[0].matchStatus).toBe('pending')
    })
  })

  describe('transformTransaction', () => {
    it('transforms transaction to row format', () => {
      const tx: Transaction = createTestTransaction({
        confidence: 'high',
      })

      const result = transformTransaction(tx)

      expect(result.id).toBe('tx1')
      expect(result.matchStatus).toBe('matched')
      expect(result.matchConfidence).toBe(0.95)
    })

    it('handles pending status', () => {
      const tx = createTestTransaction({ status: 'pending' })
      const result = transformTransaction(tx)

      expect(result.matchStatus).toBe('pending')
    })

    it('handles suspense status', () => {
      const tx = createTestTransaction({ status: 'suspense' })
      const result = transformTransaction(tx)

      expect(result.matchStatus).toBe('suspense')
    })

    it('converts high confidence to 0.95', () => {
      const tx = createTestTransaction({ confidence: 'high' })
      const result = transformTransaction(tx)

      expect(result.matchConfidence).toBe(0.95)
    })

    it('converts medium confidence to 0.80', () => {
      const tx = createTestTransaction({ confidence: 'medium' })
      const result = transformTransaction(tx)

      expect(result.matchConfidence).toBe(0.80)
    })

    it('converts low confidence to 0.60', () => {
      const tx = createTestTransaction({ confidence: 'low' })
      const result = transformTransaction(tx)

      expect(result.matchConfidence).toBe(0.60)
    })

    it('preserves matchId as reference', () => {
      const tx = createTestTransaction({ matchId: 'match-ref-123' })
      const result = transformTransaction(tx)

      expect(result.reference).toBe('match-ref-123')
    })

    it('uses empty string when no matchId', () => {
      const tx = createTestTransaction({ matchId: undefined })
      const result = transformTransaction(tx)

      expect(result.reference).toBe('')
    })
  })

  describe('transformAccrualDocument', () => {
    it('transforms accrual document to invoice row', () => {
      const doc = createTestAccrualDocument()

      const result = transformAccrualDocument(doc)

      expect(result.id).toBe('ad1')
      expect(result.invoiceNumber).toBe('INV-001')
    })

    it('handles matched status', () => {
      const doc = createTestAccrualDocument({ status: 'matched' })
      const result = transformAccrualDocument(doc)

      expect(result.matchStatus).toBe('matched')
    })

    it('handles suspense status', () => {
      const doc = createTestAccrualDocument({ status: 'suspense' })
      const result = transformAccrualDocument(doc)

      expect(result.matchStatus).toBe('suspense')
    })

    it('handles pending status', () => {
      const doc = createTestAccrualDocument({ status: 'pending' })
      const result = transformAccrualDocument(doc)

      expect(result.matchStatus).toBe('pending')
    })

    it('handles partial status as pending', () => {
      const doc = createTestAccrualDocument({ status: 'partial' })
      const result = transformAccrualDocument(doc)

      // partial status maps to pending
      expect(result.matchStatus).toBe('pending')
    })

    it('preserves date information', () => {
      const doc = createTestAccrualDocument({
        docDate: '2024-02-15',
        dueDate: '2024-03-15',
      })

      const result = transformAccrualDocument(doc)

      expect(result.date).toBe('2024-02-15')
      expect(result.dueDate).toBe('2024-03-15')
    })

    it('handles missing docNumber', () => {
      const doc = createTestAccrualDocument({ docNumber: undefined })
      const result = transformAccrualDocument(doc)

      expect(result.invoiceNumber).toBe('')
    })

    it('generates description from docNumber and counterparty', () => {
      const doc = createTestAccrualDocument({
        docNumber: 'INV-100',
        counterparty: 'Acme Corp',
        description: undefined,
      })

      const result = transformAccrualDocument(doc)

      expect(result.description).toContain('INV-100')
      expect(result.description).toContain('Acme Corp')
    })

    it('uses provided description when available', () => {
      const doc = createTestAccrualDocument({
        description: 'Custom description text',
      })

      const result = transformAccrualDocument(doc)

      expect(result.description).toBe('Custom description text')
    })
  })
})
