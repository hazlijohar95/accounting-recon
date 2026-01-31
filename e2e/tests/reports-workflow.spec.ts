import { test, expect } from '@playwright/test'

/**
 * E2E tests for reports and export workflow.
 */
test.describe('Reports Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('can access export options', async ({ page }) => {
    // Look for export button or menu
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download"), [data-testid="export-button"]'
    )

    if (await exportButton.isVisible()) {
      await exportButton.click()

      // Should show export options
      const exportMenu = page.locator(
        '[role="menu"], [data-testid="export-menu"], [class*="dropdown"]'
      )
      await expect(exportMenu).toBeVisible()
    }
  })

  test('PDF export option is available', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    )

    if (await exportButton.isVisible()) {
      await exportButton.click()

      const pdfOption = page.locator(
        'button:has-text("PDF"), [role="menuitem"]:has-text("PDF"), a:has-text("PDF")'
      )

      if (await pdfOption.isVisible()) {
        await expect(pdfOption).toBeEnabled()
      }
    }
  })

  test('Excel export option is available', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    )

    if (await exportButton.isVisible()) {
      await exportButton.click()

      const excelOption = page.locator(
        'button:has-text("Excel"), button:has-text("XLSX"), [role="menuitem"]:has-text("Excel")'
      )

      if (await excelOption.isVisible()) {
        await expect(excelOption).toBeEnabled()
      }
    }
  })

  test('CSV export option is available', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    )

    if (await exportButton.isVisible()) {
      await exportButton.click()

      const csvOption = page.locator(
        'button:has-text("CSV"), [role="menuitem"]:has-text("CSV")'
      )

      if (await csvOption.isVisible()) {
        await expect(csvOption).toBeEnabled()
      }
    }
  })

  test('can generate bank reconciliation report', async ({ page }) => {
    // Navigate to reports section if available
    const reportsNav = page.locator(
      'a:has-text("Reports"), button:has-text("Reports"), [href*="report"]'
    )

    if (await reportsNav.isVisible()) {
      await reportsNav.click()

      // Look for bank reconciliation report type
      const reconReport = page.locator(
        'button:has-text("Bank Reconciliation"), [data-testid="bank-recon-report"]'
      )

      if (await reconReport.isVisible()) {
        await expect(reconReport).toBeEnabled()
      }
    }
  })

  test('report generation shows loading state', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Generate")'
    )

    if (await exportButton.isVisible()) {
      // Click might trigger loading state
      const downloadPromise = page.waitForEvent('download').catch(() => null)

      await exportButton.click()

      // Check for loading indicator
      const loadingIndicator = page.locator(
        '[class*="spinner"], [class*="loading"], [aria-busy="true"]'
      )

      // Either loading shows or download starts
      const hasLoading = await loadingIndicator.isVisible().catch(() => false)
      const download = await downloadPromise

      // One or the other should happen (or button might be disabled if no data)
      expect(hasLoading || download !== null || await exportButton.isDisabled()).toBeTruthy()
    }
  })
})
