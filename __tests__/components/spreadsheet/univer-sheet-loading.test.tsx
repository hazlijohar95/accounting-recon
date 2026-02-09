/**
 * Tests for UniverSheetLoading component
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UniverSheetLoading } from '@/components/spreadsheet/univer-sheet-loading'

describe('UniverSheetLoading', () => {
  it('renders loading message', () => {
    render(<UniverSheetLoading />)
    expect(screen.getByText('Initializing spreadsheet...')).toBeInTheDocument()
  })

  it('applies custom height as string', () => {
    const { container } = render(<UniverSheetLoading height="800px" />)
    expect(container.firstChild).toHaveStyle({ height: '800px' })
  })

  it('applies custom height as number', () => {
    const { container } = render(<UniverSheetLoading height={500} />)
    expect(container.firstChild).toHaveStyle({ height: '500px' })
  })

  it('uses default height when not specified', () => {
    const { container } = render(<UniverSheetLoading />)
    expect(container.firstChild).toHaveStyle({ height: '600px' })
  })

  it('applies custom className', () => {
    const { container } = render(<UniverSheetLoading className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders correct number of skeleton rows', () => {
    const { container } = render(<UniverSheetLoading rows={5} />)
    // Data rows have h-7 class
    const rows = container.querySelectorAll('.h-7')
    expect(rows).toHaveLength(5)
  })

  it('renders correct number of columns in header', () => {
    const { container } = render(<UniverSheetLoading columns={4} />)
    // Check header cells (inside h-8 header row, with animate-pulse class)
    const headerRow = container.querySelector('.h-8')
    expect(headerRow).toBeInTheDocument()
    // Header row has row number div + column divs
    const headerCells = headerRow?.querySelectorAll('.animate-pulse')
    expect(headerCells?.length).toBe(4)
  })

  it('renders loading spinner', () => {
    const { container } = render(<UniverSheetLoading />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders loading dots animation', () => {
    const { container } = render(<UniverSheetLoading />)
    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots).toHaveLength(3)
  })

  it('has default 6 columns', () => {
    const { container } = render(<UniverSheetLoading />)
    const headerRow = container.querySelector('.h-8')
    // Header row has row number cell + 6 column cells
    const headerCells = headerRow?.querySelectorAll('.animate-pulse')
    expect(headerCells?.length).toBe(6)
  })

  it('has default 10 rows', () => {
    const { container } = render(<UniverSheetLoading />)
    // Data rows have h-7 class
    const rows = container.querySelectorAll('.h-7')
    expect(rows).toHaveLength(10)
  })

  it('renders with alternating row colors', () => {
    const { container } = render(<UniverSheetLoading rows={4} />)
    // Odd rows (index 1, 3) have bg-muted/10 class
    const rows = container.querySelectorAll('.h-7')
    // Check that some rows have the alternating background class
    const alternatingRows = container.querySelectorAll('.bg-muted\\/10')
    expect(alternatingRows.length).toBeGreaterThan(0)
  })

  it('renders row numbers placeholder', () => {
    const { container } = render(<UniverSheetLoading rows={3} />)
    // Row number cells are w-10
    const rowNumberCells = container.querySelectorAll('.w-10')
    // Header row number + 3 data row numbers = 4
    expect(rowNumberCells.length).toBeGreaterThanOrEqual(4)
  })

  it('renders border styles', () => {
    const { container } = render(<UniverSheetLoading />)
    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-border')
    expect(container.firstChild).toHaveClass('rounded-lg')
  })

  it('renders with overflow hidden', () => {
    const { container } = render(<UniverSheetLoading />)
    expect(container.firstChild).toHaveClass('overflow-hidden')
  })
})
