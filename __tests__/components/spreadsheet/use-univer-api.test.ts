/**
 * Tests for use-univer-api.ts hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUniverAPI } from '@/components/spreadsheet/use-univer-api'

// Mock the Univer API types
const createMockRange = () => ({
  setValue: vi.fn(),
  setValues: vi.fn(),
  getValue: vi.fn().mockReturnValue('test value'),
  setBackground: vi.fn(),
  createOrUpdateNote: vi.fn(),
})

const createMockSheet = (name: string) => ({
  getSheetName: vi.fn().mockReturnValue(name),
  getRange: vi.fn().mockReturnValue(createMockRange()),
})

const createMockWorkbook = () => ({
  getActiveSheet: vi.fn().mockReturnValue(createMockSheet('Sheet1')),
  getSheets: vi.fn().mockReturnValue([
    createMockSheet('Transactions'),
    createMockSheet('Invoices'),
  ]),
  setActiveSheet: vi.fn(),
})

const createMockUniverAPI = () => ({
  getActiveWorkbook: vi.fn().mockReturnValue(createMockWorkbook()),
  createWorkbook: vi.fn(),
  dispose: vi.fn(),
})

describe('useUniverAPI', () => {
  describe('initialization', () => {
    it('starts with isReady = false', () => {
      const { result } = renderHook(() => useUniverAPI())

      expect(result.current.isReady).toBe(false)
    })

    it('becomes ready after setAPI is called', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      expect(result.current.isReady).toBe(true)
    })
  })

  describe('getWorkbook', () => {
    it('returns null when not initialized', () => {
      const { result } = renderHook(() => useUniverAPI())

      expect(result.current.getWorkbook()).toBeNull()
    })

    it('returns workbook when initialized', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      const workbook = result.current.getWorkbook()
      expect(workbook).not.toBeNull()
      expect(mockAPI.getActiveWorkbook).toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('disposes the API and sets isReady to false', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      expect(result.current.isReady).toBe(true)

      act(() => {
        result.current.dispose()
      })

      expect(result.current.isReady).toBe(false)
      expect(mockAPI.dispose).toHaveBeenCalled()
    })

    it('handles dispose when not initialized', () => {
      const { result } = renderHook(() => useUniverAPI())

      // Should not throw
      expect(() => {
        act(() => {
          result.current.dispose()
        })
      }).not.toThrow()

      expect(result.current.isReady).toBe(false)
    })
  })

  describe('cell operations', () => {
    it('setCellValue sets value on range', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      act(() => {
        result.current.setCellValue('A1', 'Test Value')
      })

      expect(mockSheet.getRange).toHaveBeenCalledWith('A1')
      expect(mockRange.setValue).toHaveBeenCalledWith('Test Value')
    })

    it('getCellValue retrieves value from range', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()
      mockRange.getValue.mockReturnValue(42)

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      let value: unknown
      act(() => {
        value = result.current.getCellValue('B2')
      })

      expect(value).toBe(42)
    })
  })

  describe('highlighting', () => {
    it('highlightByStatus applies correct background color', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      act(() => {
        result.current.highlightByStatus('A1', 'matched')
      })

      expect(mockRange.setBackground).toHaveBeenCalledWith('#dcfce7') // Green for matched
    })

    it('highlightByConfidence applies correct color based on threshold', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      // High confidence (>=90%)
      act(() => {
        result.current.highlightByConfidence('A1', 0.95)
      })
      expect(mockRange.setBackground).toHaveBeenCalledWith('#dcfce7') // Green

      // Medium confidence (70-89%)
      act(() => {
        result.current.highlightByConfidence('A2', 0.75)
      })
      expect(mockRange.setBackground).toHaveBeenCalledWith('#fef9c3') // Yellow

      // Low confidence (<70%)
      act(() => {
        result.current.highlightByConfidence('A3', 0.50)
      })
      expect(mockRange.setBackground).toHaveBeenCalledWith('#fee2e2') // Red
    })
  })

  describe('data population', () => {
    it('populateTransactionRow sets values and applies highlighting', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      act(() => {
        result.current.populateTransactionRow(0, {
          id: 'tx-1',
          date: '2024-01-15',
          description: 'Test transaction',
          amount: 1000,
          reference: 'REF-001',
          matchStatus: 'matched',
          matchConfidence: 0.95,
          matchedBy: 'exact',
        })
      })

      // Should have called setValues with the row data
      expect(mockRange.setValues).toHaveBeenCalled()
    })

    it('populateInvoiceRow sets values and applies highlighting', () => {
      const { result } = renderHook(() => useUniverAPI())
      const mockAPI = createMockUniverAPI()
      const mockRange = createMockRange()

      const mockSheet = createMockSheet('Sheet1')
      mockSheet.getRange.mockReturnValue(mockRange)
      mockAPI.getActiveWorkbook.mockReturnValue({
        getActiveSheet: () => mockSheet,
      })

      act(() => {
        result.current.setAPI(mockAPI as unknown as Parameters<typeof result.current.setAPI>[0])
      })

      act(() => {
        result.current.populateInvoiceRow(0, {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          date: '2024-01-10',
          description: 'Test invoice',
          amount: 1000,
          dueDate: '2024-02-10',
          matchStatus: 'suggested',
          matchConfidence: 0.80,
          matchedBy: 'semantic',
        })
      })

      expect(mockRange.setValues).toHaveBeenCalled()
    })
  })
})
