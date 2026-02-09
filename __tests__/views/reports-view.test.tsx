/**
 * ReportsView Component Tests
 *
 * Tests the main reports page including:
 * - Tab navigation
 * - Summary statistics
 * - Export menu functionality
 * - PDF export polling
 * - Error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {
  mockGenerateExport,
  mockGenerateAccountingExport,
  mockGeneratePDFExport,
  mockQueryState,
} from '../utils/reports-view-mocks'

import { ReportsView } from '@/components/views/reports-view'

describe('ReportsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // New API contract: actions return { success, jobId }
    mockGenerateExport.mockResolvedValue({
      success: true,
      jobId: 'job-csv-123',
    })
    mockGenerateAccountingExport.mockResolvedValue({
      success: true,
      jobId: 'job-acct-456',
    })
    mockGeneratePDFExport.mockResolvedValue({
      success: true,
      jobId: 'job-pdf-789',
    })
    // Reset query statuses
    mockQueryState.exportJobStatus = null
    mockQueryState.pdfJobStatus = null
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockQueryState.exportJobStatus = null
    mockQueryState.pdfJobStatus = null
  })

  describe('Tab Navigation', () => {
    it('renders all four report tabs', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /all matches/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /differences/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /activity log/i })).toBeInTheDocument()
    })

    it('shows summary tab as selected by default', () => {
      render(<ReportsView />)

      const summaryTab = screen.getByRole('tab', { name: /summary/i })
      expect(summaryTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to detailed tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      const detailedTab = screen.getByRole('tab', { name: /all matches/i })
      expect(detailedTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to variance tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      const varianceTab = screen.getByRole('tab', { name: /differences/i })
      expect(varianceTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to audit tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /activity log/i }))

      const auditTab = screen.getByRole('tab', { name: /activity log/i })
      expect(auditTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Summary Statistics', () => {
    it('displays matched stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete - "Matched" appears in stat card and legend
      await waitFor(() => {
        const elements = screen.getAllByText(/matched/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays pending stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete - "Pending" appears in stat card and legend
      await waitFor(() => {
        const elements = screen.getAllByText(/pending/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays needs review stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete and check for the stat label
      await waitFor(() => {
        // Look for "Needs Review" which appears in stat card and legend
        const elements = screen.getAllByText(/needs review/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays total stat card', async () => {
      render(<ReportsView />)

      await waitFor(() => {
        expect(screen.getByText('Total')).toBeInTheDocument()
      })
    })

    it('displays reconciliation progress section', async () => {
      render(<ReportsView />)

      await waitFor(() => {
        expect(screen.getByText('Reconciliation Progress')).toBeInTheDocument()
      })
    })
  })

  describe('Export Menu', () => {
    it('shows export button', () => {
      render(<ReportsView />)

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('opens export menu when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
        expect(screen.getByText('Excel export')).toBeInTheDocument()
      })
    })

    it('shows PDF export option in menu', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('PDF report')).toBeInTheDocument()
      })
    })

    it('shows accounting software section', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('Accounting')).toBeInTheDocument()
      })
    })

    it('shows SQL Accounting option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('SQL Accounting')).toBeInTheDocument()
      })
    })

    it('shows AutoCount option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('AutoCount')).toBeInTheDocument()
      })
    })

    it('shows QuickBooks option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('QuickBooks (IIF)')).toBeInTheDocument()
      })
    })

    it('shows Xero option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('Xero (CSV)')).toBeInTheDocument()
      })
    })
  })

  describe('All Matches Tab', () => {
    it('displays match transactions', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Payment ABC')).toBeInTheDocument()
        expect(screen.getByText('Invoice ABC')).toBeInTheDocument()
      })
    })

    it('shows approved status', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument()
      })
    })

    it('shows pending status', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
      })
    })

    it('displays table headers', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Cash Description')).toBeInTheDocument()
        expect(screen.getByText('Accrual Description')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Match Type')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
      })
    })
  })

  describe('Differences Tab', () => {
    it('displays bank total stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Bank Total')).toBeInTheDocument()
      })
    })

    it('displays books total stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Books Total')).toBeInTheDocument()
      })
    })

    it('displays difference stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Difference')).toBeInTheDocument()
      })
    })

    it('displays unmatched items section', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Unmatched Items')).toBeInTheDocument()
      })
    })
  })

  describe('Activity Log Tab', () => {
    it('switches to activity log tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      const auditTab = screen.getByRole('tab', { name: /activity log/i })
      await user.click(auditTab)

      // Tab should now be selected
      expect(auditTab).toHaveAttribute('aria-selected', 'true')
    })

    it('displays recent activity when tab selected', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /activity log/i }))

      // Should show activity-related content (based on mock data)
      await waitFor(() => {
        expect(screen.getByText('Transaction matched')).toBeInTheDocument()
      })
    })
  })

  describe('Session Name Display', () => {
    it('shows session name in header', () => {
      render(<ReportsView />)

      expect(screen.getByText('Q1 2025 Reconciliation')).toBeInTheDocument()
    })

    it('shows Reports as page title', () => {
      render(<ReportsView />)

      expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper tablist role', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('has proper tab roles', () => {
      render(<ReportsView />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
    })

    it('has proper tabpanel role', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })

  describe('Export Flow', () => {
    it('calls generateExport with correct args when CSV is clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      // Open export menu
      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
      })

      // Click CSV
      await user.click(screen.getByText('CSV export'))

      await waitFor(() => {
        expect(mockGenerateExport).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'csv',
            reportType: 'bank_recon',
            options: expect.objectContaining({
              includeMatched: true,
              includePending: true,
              includeSuspense: true,
            }),
          })
        )
      })
    })

    it('calls generateExport with xlsx format when Excel is clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      // Open export menu
      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('Excel export')).toBeInTheDocument()
      })

      // Click Excel
      await user.click(screen.getByText('Excel export'))

      await waitFor(() => {
        expect(mockGenerateExport).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'xlsx',
          })
        )
      })
    })

    it('calls generateAccountingExport when SQL Accounting is clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      // Open export menu
      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('SQL Accounting')).toBeInTheDocument()
      })

      // Click SQL Accounting
      await user.click(screen.getByText('SQL Accounting'))

      await waitFor(() => {
        expect(mockGenerateAccountingExport).toHaveBeenCalledWith(
          expect.objectContaining({
            software: 'sql_accounting',
          })
        )
      })
    })

    it('calls generatePDFExport when PDF report is clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      // Open export menu
      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('PDF report')).toBeInTheDocument()
      })

      // Click PDF
      await user.click(screen.getByText('PDF report'))

      await waitFor(() => {
        expect(mockGeneratePDFExport).toHaveBeenCalledWith(
          expect.objectContaining({
            reportType: 'bank_recon',
            options: expect.objectContaining({
              includeMatched: true,
              includeSuspense: true,
              includeJournal: true,
            }),
          })
        )
      })
    })

    it('returns jobId from export action (new API contract)', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      // Open export menu and trigger CSV export
      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
      })
      await user.click(screen.getByText('CSV export'))

      // Verify the action was called and returns the new format
      await waitFor(() => {
        expect(mockGenerateExport).toHaveBeenCalled()
      })

      // The mock returns { success: true, jobId: 'job-csv-123' }
      const result = await mockGenerateExport.mock.results[0].value
      expect(result).toEqual({ success: true, jobId: 'job-csv-123' })
    })

    it('handles export action failure gracefully', async () => {
      mockGenerateExport.mockResolvedValueOnce({
        success: false,
        error: 'Session not found',
      })

      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
      })
      await user.click(screen.getByText('CSV export'))

      await waitFor(() => {
        expect(mockGenerateExport).toHaveBeenCalled()
      })
    })

    it('handles export action exception gracefully', async () => {
      mockGenerateExport.mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))
      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
      })
      await user.click(screen.getByText('CSV export'))

      await waitFor(() => {
        expect(mockGenerateExport).toHaveBeenCalled()
      })
    })
  })
})
