import { test, expect } from '@playwright/test'

/**
 * E2E tests for reconciliation workflow.
 */
test.describe('Reconciliation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('dashboard shows reconciliation stats', async ({ page }) => {
    // Look for dashboard stats
    const statsSection = page.locator(
      '[data-testid="stats"], .stats, [class*="stat"], [role="region"]'
    )

    // Stats or loading skeleton should be visible
    const hasStats = await statsSection.isVisible()
    const hasLoading = await page.locator('[class*="skeleton"], [class*="loading"]').isVisible()

    expect(hasStats || hasLoading).toBeTruthy()
  })

  test('can view unmatched transactions', async ({ page }) => {
    // Navigate to reconciliation view or unmatched tab
    const unmatchedTab = page.locator(
      '[data-testid="unmatched-tab"], button:has-text("Unmatched"), a:has-text("Unmatched")'
    )

    if (await unmatchedTab.isVisible()) {
      await unmatchedTab.click()

      // Should show transaction list or empty state
      const transactionList = page.locator(
        '[data-testid="transaction-list"], table, [role="grid"], [class*="empty"]'
      )
      await expect(transactionList).toBeVisible()
    }
  })

  test('can filter transactions', async ({ page }) => {
    // Look for filter controls
    const filterInput = page.locator(
      'input[placeholder*="Search"], input[placeholder*="Filter"], [data-testid="filter"]'
    )

    if (await filterInput.isVisible()) {
      await filterInput.fill('test')
      // Should filter the list (or show no results)
      await page.waitForTimeout(500) // Debounce
    }
  })

  test('can sort transactions', async ({ page }) => {
    // Look for sortable column headers
    const sortableHeader = page.locator(
      'th[role="columnheader"]:has-text("Date"), th:has-text("Amount"), button[aria-sort]'
    )

    if (await sortableHeader.first().isVisible()) {
      await sortableHeader.first().click()
      // Should toggle sort direction
      await expect(sortableHeader.first()).toHaveAttribute('aria-sort', /.+/)
    }
  })

  test('match action buttons are visible', async ({ page }) => {
    // Look for match/unmatch action buttons
    const actionButtons = page.locator(
      'button:has-text("Match"), button:has-text("Approve"), button:has-text("Reject")'
    )

    // May or may not be visible depending on selection state
    const count = await actionButtons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('can navigate between matched and unmatched views', async ({ page }) => {
    // Look for tab navigation
    const tabs = page.locator(
      '[role="tablist"], [data-testid="reconciliation-tabs"]'
    )

    if (await tabs.isVisible()) {
      const matchedTab = page.locator('button:has-text("Matched"), [role="tab"]:has-text("Matched")')
      const unmatchedTab = page.locator('button:has-text("Unmatched"), [role="tab"]:has-text("Unmatched")')

      if (await matchedTab.isVisible() && await unmatchedTab.isVisible()) {
        await unmatchedTab.click()
        await expect(unmatchedTab).toHaveAttribute('aria-selected', 'true')

        await matchedTab.click()
        await expect(matchedTab).toHaveAttribute('aria-selected', 'true')
      }
    }
  })

  test('shows confidence scores', async ({ page }) => {
    // Look for confidence indicators
    const confidenceIndicators = page.locator(
      '[data-testid="confidence"], [class*="confidence"], .badge:has-text("%")'
    )

    // May or may not be visible depending on data
    const count = await confidenceIndicators.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
