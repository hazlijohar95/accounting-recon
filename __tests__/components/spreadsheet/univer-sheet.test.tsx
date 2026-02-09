/**
 * Tests for UniverSheet component (now backed by JspreadsheetSheet)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { ReconciliationSheetData } from '@/components/spreadsheet/types'

// Mock jspreadsheet-ce
const mockInstance = {
  setData: vi.fn(),
  setStyle: vi.fn(),
  destroy: vi.fn(),
  getStyle: vi.fn(() => ({})),
}

vi.mock('jspreadsheet-ce', () => ({
  default: vi.fn(() => mockInstance),
}))

vi.mock('jspreadsheet-ce/dist/jspreadsheet.css', () => ({}))
vi.mock('jsuites/dist/jsuites.css', () => ({}))

// Import after mocks are set up
import { UniverSheet, UniverSheetReadOnly } from '@/components/spreadsheet/univer-sheet'

describe('UniverSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the container element', () => {
    render(<UniverSheet />)

    expect(screen.getByTestId('jspreadsheet-sheet')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<UniverSheet className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('applies custom height as string', () => {
    const { container } = render(<UniverSheet height="800px" />)

    expect(container.firstChild).toHaveStyle({ height: '800px' })
  })

  it('applies custom height as number', () => {
    const { container } = render(<UniverSheet height={500} />)

    expect(container.firstChild).toHaveStyle({ height: '500px' })
  })

  it('uses default height when not specified', () => {
    const { container } = render(<UniverSheet />)

    expect(container.firstChild).toHaveStyle({ height: '600px' })
  })

  describe('with data', () => {
    const mockData: ReconciliationSheetData = {
      transactions: [
        {
          id: 'tx-1',
          date: '2024-01-15',
          description: 'Test transaction',
          amount: 1000,
          matchStatus: 'matched',
        },
      ],
      invoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          date: '2024-01-10',
          description: 'Test invoice',
          amount: 1000,
          matchStatus: 'pending',
        },
      ],
    }

    it('accepts data prop', () => {
      // Should not throw
      expect(() => {
        render(<UniverSheet data={mockData} />)
      }).not.toThrow()
    })

    it('renders without data', () => {
      expect(() => {
        render(<UniverSheet />)
      }).not.toThrow()
    })
  })

  describe('UniverSheetReadOnly', () => {
    it('renders with readOnly prop', () => {
      render(<UniverSheetReadOnly />)

      expect(screen.getByTestId('jspreadsheet-sheet')).toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('cleans up on unmount without errors', () => {
      const { unmount } = render(<UniverSheet />)

      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('handles multiple mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<UniverSheet />)
        expect(() => {
          unmount()
        }).not.toThrow()
      }
    })
  })
})
