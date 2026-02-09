import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileItemStatus, getExtractionSummary } from '@/components/file-item-status'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('getExtractionSummary', () => {
  it('builds bank statement summary', () => {
    const summary = getExtractionSummary('bank_statement', 5, 'maybank', '2024-01-01')
    expect(summary.title).toBe('5 transactions extracted')
    expect(summary.description).toContain('Maybank')
    expect(summary.navigationPath).toBe('/reconcile')
  })

  it('builds invoice summary with details', () => {
    const summary = getExtractionSummary(
      'invoice',
      undefined,
      undefined,
      undefined,
      { docNumber: 'INV-1', counterparty: 'Acme', amount: 120 }
    )
    expect(summary.title).toBe('Invoice captured')
    expect(summary.description).toContain('INV-1')
  })
})

describe('FileItemStatus', () => {
  it('renders idle actions', () => {
    const onUpload = vi.fn()
    const onRemove = vi.fn()
    render(
      <FileItemStatus
        status="idle"
        fileName="test.pdf"
        onUpload={onUpload}
        onRemove={onRemove}
      />
    )

    fireEvent.click(screen.getByText('Upload'))
    expect(onUpload).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByLabelText('Remove test.pdf'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('renders uploading progress', () => {
    render(
      <FileItemStatus
        status="uploading"
        fileName="test.pdf"
        progress={40}
      />
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  it('renders failed state', () => {
    render(
      <FileItemStatus
        status="failed"
        fileName="test.pdf"
        errorMessage="Nope"
      />
    )
    expect(screen.getByText('Nope')).toBeInTheDocument()
  })

  it('renders complete fallback when summary is missing', () => {
    render(
      <FileItemStatus
        status="complete"
        fileName="test.pdf"
      />
    )
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })
})
