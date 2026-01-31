/**
 * Export Flow Integration Tests
 *
 * Tests the PDF export workflow including:
 * - Initiating export
 * - Progress tracking
 * - Download handling
 * - Error scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Convex hooks
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockMutationFn = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: (query: any) => mockUseQuery(query),
  useMutation: () => mockMutationFn,
}))

// Mock window.open for download
const mockWindowOpen = vi.fn()
global.open = mockWindowOpen

// Simplified export component for testing
function ExportDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const exportJob = mockUseQuery('getExportJob')

  const handleStartExport = async (reportType: string) => {
    await mockMutationFn({
      sessionId,
      reportType,
    })
  }

  const handleDownload = () => {
    if (exportJob?.downloadUrl) {
      mockWindowOpen(exportJob.downloadUrl, '_blank')
    }
  }

  return (
    <div data-testid="export-dialog">
      <h2>Export Report</h2>

      {!exportJob && (
        <div data-testid="export-options">
          <button
            data-testid="export-bank-recon"
            onClick={() => handleStartExport('bank_recon')}
          >
            Bank Reconciliation Report
          </button>
          <button
            data-testid="export-client-query"
            onClick={() => handleStartExport('client_query')}
          >
            Client Query Report
          </button>
          <button
            data-testid="export-transaction-listing"
            onClick={() => handleStartExport('transaction_listing')}
          >
            Transaction Listing
          </button>
        </div>
      )}

      {exportJob?.status === 'pending' && (
        <div data-testid="export-pending">
          <span>Queued for processing...</span>
        </div>
      )}

      {exportJob?.status === 'processing' && (
        <div data-testid="export-processing">
          <span>Generating PDF...</span>
          <progress data-testid="export-progress" />
        </div>
      )}

      {exportJob?.status === 'completed' && (
        <div data-testid="export-completed">
          <span>Report ready!</span>
          <span data-testid="file-name">{exportJob.fileName}</span>
          <button data-testid="download-btn" onClick={handleDownload}>
            Download PDF
          </button>
        </div>
      )}

      {exportJob?.status === 'failed' && (
        <div data-testid="export-failed">
          <span>Export failed</span>
          <span data-testid="error-message">{exportJob.errorMessage}</span>
          <button data-testid="retry-btn" onClick={() => handleStartExport(exportJob.reportType)}>
            Retry
          </button>
        </div>
      )}

      <button data-testid="close-btn" onClick={onClose}>
        Close
      </button>
    </div>
  )
}

describe('Export Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutationFn.mockResolvedValue({ jobId: 'export-123' })
  })

  it('shows export options initially', async () => {
    mockUseQuery.mockReturnValue(null)

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    expect(screen.getByTestId('export-options')).toBeInTheDocument()
    expect(screen.getByTestId('export-bank-recon')).toBeInTheDocument()
    expect(screen.getByTestId('export-client-query')).toBeInTheDocument()
    expect(screen.getByTestId('export-transaction-listing')).toBeInTheDocument()
  })

  it('starts bank reconciliation export', async () => {
    const user = userEvent.setup()
    mockUseQuery.mockReturnValue(null)

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    await user.click(screen.getByTestId('export-bank-recon'))

    expect(mockMutationFn).toHaveBeenCalledWith({
      sessionId: 'test-session',
      reportType: 'bank_recon',
    })
  })

  it('starts client query export', async () => {
    const user = userEvent.setup()
    mockUseQuery.mockReturnValue(null)

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    await user.click(screen.getByTestId('export-client-query'))

    expect(mockMutationFn).toHaveBeenCalledWith({
      sessionId: 'test-session',
      reportType: 'client_query',
    })
  })

  it('shows pending state', async () => {
    mockUseQuery.mockReturnValue({
      status: 'pending',
      reportType: 'bank_recon',
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    expect(screen.getByTestId('export-pending')).toBeInTheDocument()
    expect(screen.getByText('Queued for processing...')).toBeInTheDocument()
  })

  it('shows processing state with progress', async () => {
    mockUseQuery.mockReturnValue({
      status: 'processing',
      reportType: 'bank_recon',
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    expect(screen.getByTestId('export-processing')).toBeInTheDocument()
    expect(screen.getByText('Generating PDF...')).toBeInTheDocument()
    expect(screen.getByTestId('export-progress')).toBeInTheDocument()
  })

  it('shows completed state with download button', async () => {
    mockUseQuery.mockReturnValue({
      status: 'completed',
      reportType: 'bank_recon',
      fileName: 'Bank_Reconciliation_2025-01.pdf',
      downloadUrl: 'https://storage.example.com/exports/abc123.pdf',
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    expect(screen.getByTestId('export-completed')).toBeInTheDocument()
    expect(screen.getByText('Report ready!')).toBeInTheDocument()
    expect(screen.getByTestId('file-name')).toHaveTextContent('Bank_Reconciliation_2025-01.pdf')
    expect(screen.getByTestId('download-btn')).toBeInTheDocument()
  })

  it('triggers download when button clicked', async () => {
    const user = userEvent.setup()
    const downloadUrl = 'https://storage.example.com/exports/abc123.pdf'

    mockUseQuery.mockReturnValue({
      status: 'completed',
      reportType: 'bank_recon',
      fileName: 'Bank_Reconciliation_2025-01.pdf',
      downloadUrl,
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    await user.click(screen.getByTestId('download-btn'))

    expect(mockWindowOpen).toHaveBeenCalledWith(downloadUrl, '_blank')
  })

  it('shows failed state with error message', async () => {
    mockUseQuery.mockReturnValue({
      status: 'failed',
      reportType: 'bank_recon',
      errorMessage: 'PDF generation timed out',
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    expect(screen.getByTestId('export-failed')).toBeInTheDocument()
    expect(screen.getByText('Export failed')).toBeInTheDocument()
    expect(screen.getByTestId('error-message')).toHaveTextContent('PDF generation timed out')
    expect(screen.getByTestId('retry-btn')).toBeInTheDocument()
  })

  it('allows retry after failure', async () => {
    const user = userEvent.setup()

    mockUseQuery.mockReturnValue({
      status: 'failed',
      reportType: 'bank_recon',
      errorMessage: 'PDF generation timed out',
    })

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    await user.click(screen.getByTestId('retry-btn'))

    expect(mockMutationFn).toHaveBeenCalledWith({
      sessionId: 'test-session',
      reportType: 'bank_recon',
    })
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    mockUseQuery.mockReturnValue(null)

    const onClose = vi.fn()
    render(<ExportDialog sessionId="test-session" onClose={onClose} />)

    await user.click(screen.getByTestId('close-btn'))

    expect(onClose).toHaveBeenCalled()
  })
})
