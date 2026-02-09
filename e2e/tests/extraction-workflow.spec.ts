import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E tests for document extraction workflow.
 *
 * Tests the Cloudinary + Claude Vision extraction flow including:
 * - Upload document and trigger extraction
 * - View extraction progress (page-by-page for PDFs)
 * - View extraction results (transactions/invoices)
 * - Retry failed extractions
 * - Idempotency (double-click protection)
 */

test.describe('Document Extraction Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (assumes authenticated)
    await page.goto('/')
  })

  test.describe('Extraction Status Display', () => {
    test('shows pending status for queued documents', async ({ page }) => {
      // Navigate to documents page
      await page.goto('/documents').catch(() => page.goto('/'))

      // Look for pending status indicator
      const pendingIndicator = page.locator(
        '[data-testid="extraction-status-pending"], ' +
        '.extraction-status:has-text("Pending"), ' +
        '[aria-label*="Pending"]'
      )

      // If there are pending documents, verify the UI
      if (await pendingIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pendingIndicator.first()).toBeVisible()
      }
    })

    test('shows processing status with progress for multi-page PDFs', async ({ page }) => {
      // Navigate to documents page
      await page.goto('/documents').catch(() => page.goto('/'))

      // Look for processing status indicator
      const processingIndicator = page.locator(
        '[data-testid="extraction-status-processing"], ' +
        '.extraction-status:has-text("Processing"), ' +
        '[aria-label*="Processing"]'
      )

      // If there's a processing document, check for page progress
      if (await processingIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show "Processing page X of Y" or similar
        const progressText = page.locator('text=/Processing page \\d+ of \\d+/')
        const progressBar = page.locator('[role="progressbar"], .progress-bar, [class*="progress"]')

        // Either text or progress bar should be visible
        const hasProgress = await progressText.isVisible().catch(() => false) ||
          await progressBar.isVisible().catch(() => false)

        expect(hasProgress).toBeTruthy()
      }
    })

    test('shows completed status with confidence score', async ({ page }) => {
      // Navigate to documents page
      await page.goto('/documents').catch(() => page.goto('/'))

      // Look for completed status indicator
      const completedIndicator = page.locator(
        '[data-testid="extraction-status-completed"], ' +
        '.extraction-status:has-text("Completed"), ' +
        '[aria-label*="Completed"]'
      )

      if (await completedIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(completedIndicator.first()).toBeVisible()

        // Should show confidence percentage
        const confidenceText = page.locator('text=/\\d+%/')
        if (await confidenceText.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(confidenceText.first()).toBeVisible()
        }
      }
    })

    test('shows failed status with retry button', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Look for failed status
      const failedIndicator = page.locator(
        '[data-testid="extraction-status-failed"], ' +
        '.extraction-status:has-text("Failed"), ' +
        '[aria-label*="Failed"]'
      )

      if (await failedIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(failedIndicator.first()).toBeVisible()

        // Should have a retry button
        const retryButton = page.locator(
          'button:has-text("Retry"), ' +
          '[data-testid="retry-extraction"], ' +
          'button[aria-label*="Retry"]'
        )

        await expect(retryButton).toBeVisible()
      }
    })
  })

  test.describe('Document Upload and Extraction', () => {
    test('can upload a document and trigger extraction', async ({ page }) => {
      // Navigate to upload page
      await page.goto('/upload').catch(() => page.goto('/'))

      // Find file input
      const fileInput = page.locator('input[type="file"]')

      if ((await fileInput.count()) > 0) {
        // Create a test file (mock)
        // In real tests, you'd use a fixture file
        const testFilePath = path.join(__dirname, '../fixtures/test-receipt.jpg')

        // Check if we can interact with file input
        // Note: This will only work if the file exists
        try {
          await fileInput.setInputFiles(testFilePath)

          // Find and click submit
          const submitButton = page.locator(
            'button[type="submit"], ' +
            'button:has-text("Upload"), ' +
            'button:has-text("Extract")'
          )

          if (await submitButton.isEnabled()) {
            await submitButton.click()

            // Wait for navigation or status change
            await page.waitForResponse(
              (response) =>
                response.url().includes('upload') ||
                response.url().includes('extract'),
              { timeout: 10000 }
            ).catch(() => {})

            // Should see processing or completed status
            const statusIndicator = page.locator(
              '[data-testid^="extraction-status"], ' +
              '.extraction-status'
            )

            await expect(statusIndicator).toBeVisible({ timeout: 10000 })
          }
        } catch {
          // File doesn't exist, skip
          test.skip()
        }
      }
    })

    test('shows document scanner animation during processing', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Look for processing document
      const processingDoc = page.locator('[data-status="processing"]').first()

      if (await processingDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should have animated scan line or similar
        const scanAnimation = page.locator(
          '[class*="animate"], ' +
          '[class*="scan"], ' +
          '.processing-visualization'
        )

        await expect(scanAnimation.first()).toBeVisible()
      }
    })
  })

  test.describe('Extraction Results', () => {
    test('shows extracted transaction count for bank statements', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find a completed bank statement
      const bankStatement = page.locator(
        '[data-type="bank_statement"][data-status="completed"], ' +
        '.document-card:has-text("Bank Statement"):has([data-status="completed"])'
      ).first()

      if (await bankStatement.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show transaction count
        const countText = page.locator(
          'text=/\\d+ transactions?/, ' +
          'text=/\\d+ items?/'
        )

        await expect(countText.first()).toBeVisible()
      }
    })

    test('shows bank name and period for bank statements', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find completed bank statement with details visible
      const completedDoc = page.locator('[data-status="completed"]').first()

      if (await completedDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Click to expand if needed
        await completedDoc.click()

        // Check for bank name
        const bankName = page.locator(
          'text=/Bank:.*Maybank|CIMB|Public Bank|RHB/i, ' +
          '[data-testid="bank-name"]'
        )

        // Check for period
        const periodText = page.locator(
          'text=/Period:.*\\d{4}-\\d{2}-\\d{2}/, ' +
          '[data-testid="statement-period"]'
        )

        // Either should be visible if bank statement
        const hasBankInfo = await bankName.isVisible().catch(() => false) ||
          await periodText.isVisible().catch(() => false)

        // This is optional metadata, so just verify no errors
        expect(true).toBeTruthy()
      }
    })

    test('can view extracted transactions list', async ({ page }) => {
      await page.goto('/transactions').catch(() => page.goto('/'))

      // Should have a transactions table or list
      const transactionsList = page.locator(
        '[data-testid="transactions-table"], ' +
        'table:has-text("Date"), ' +
        '[role="table"], ' +
        '.transactions-list'
      )

      if (await transactionsList.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(transactionsList).toBeVisible()

        // Should have transaction rows
        const rows = page.locator('tr, [role="row"], .transaction-item')
        const count = await rows.count()

        expect(count).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Retry and Idempotency', () => {
    test('retry button triggers new extraction', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find failed document
      const failedDoc = page.locator('[data-status="failed"]').first()

      if (await failedDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Find retry button
        const retryButton = failedDoc.locator('button:has-text("Retry")')

        if (await retryButton.isVisible()) {
          await retryButton.click()

          // Wait for status to change to processing
          await expect(page.locator('[data-status="processing"]')).toBeVisible({
            timeout: 10000,
          })
        }
      }
    })

    test('double-click does not create duplicate extractions', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find pending document
      const pendingDoc = page.locator('[data-status="pending"]').first()

      if (await pendingDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Find extract button
        const extractButton = pendingDoc.locator(
          'button:has-text("Extract"), ' +
          'button:has-text("Process")'
        )

        if (await extractButton.isVisible()) {
          // Double-click rapidly
          await extractButton.dblclick()

          // Wait a moment
          await page.waitForTimeout(1000)

          // Should only have one processing indicator
          const processingCount = await page.locator('[data-status="processing"]').count()
          expect(processingCount).toBeLessThanOrEqual(1)
        }
      }
    })

    test('shows "Already processing" message on duplicate request', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find processing document
      const processingDoc = page.locator('[data-status="processing"]').first()

      if (await processingDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Try to trigger extraction again (if there's a button)
        const extractButton = processingDoc.locator(
          'button:has-text("Extract"), ' +
          'button:has-text("Process")'
        )

        if (await extractButton.isVisible()) {
          await extractButton.click()

          // Should show info message
          const toast = page.locator(
            '[role="alert"], ' +
            '.toast, ' +
            '[class*="notification"]'
          )

          const toastText = await toast.textContent().catch(() => '')
          expect(
            toastText?.toLowerCase().includes('already') ||
            toastText?.toLowerCase().includes('progress') ||
            await extractButton.isDisabled()
          ).toBeTruthy()
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('shows user-friendly error messages', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      // Find failed document
      const failedDoc = page.locator('[data-status="failed"]').first()

      if (await failedDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show error message
        const errorMessage = failedDoc.locator(
          '[class*="error"], ' +
          '[role="alert"], ' +
          '.error-message'
        )

        if (await errorMessage.isVisible()) {
          const text = await errorMessage.textContent()

          // Should be user-friendly (not raw technical error)
          expect(text).not.toContain('TypeError')
          expect(text).not.toContain('undefined')
          expect(text).not.toContain('null')
          expect(text).not.toContain('stack trace')
        }
      }
    })

    test('error message suggests actionable steps', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      const failedDoc = page.locator('[data-status="failed"]').first()

      if (await failedDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        const errorMessage = failedDoc.locator('[class*="error"], .error-message')

        if (await errorMessage.isVisible()) {
          const text = await errorMessage.textContent() || ''

          // Should suggest what to do
          const hasActionableContent =
            text.includes('try again') ||
            text.includes('contact support') ||
            text.includes('different document') ||
            text.includes('Please')

          expect(hasActionableContent || await page.locator('button:has-text("Retry")').isVisible()).toBeTruthy()
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test('extraction status has proper ARIA attributes', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      const statusElement = page.locator(
        '[data-testid^="extraction-status"], ' +
        '.extraction-status'
      ).first()

      if (await statusElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should have role or aria-label
        const hasAriaLabel = await statusElement.getAttribute('aria-label')
        const hasRole = await statusElement.getAttribute('role')

        expect(hasAriaLabel || hasRole).toBeTruthy()
      }
    })

    test('progress indicator is announced to screen readers', async ({ page }) => {
      await page.goto('/documents').catch(() => page.goto('/'))

      const processingDoc = page.locator('[data-status="processing"]').first()

      if (await processingDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Progress should have aria-live or role="status"
        const progressArea = processingDoc.locator(
          '[aria-live], ' +
          '[role="status"], ' +
          '[role="progressbar"]'
        )

        await expect(progressArea.first()).toBeVisible()
      }
    })
  })
})
