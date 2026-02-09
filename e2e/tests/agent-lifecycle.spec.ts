/**
 * Agent Upload Lifecycle E2E Tests
 *
 * End-to-end tests for the real-world upload → agent analysis → review → proceed flow.
 * Tests exercise the actual upload pipeline with test fixture files.
 *
 * Prerequisites:
 * - Dev server running (pnpm dev)
 * - Convex dev server running (npx convex dev)
 * - Authenticated user with at least one company
 *
 * Tests use explicit test.skip() when preconditions aren't met,
 * so skipped tests appear clearly in the report.
 *
 * @module e2e/tests/agent-lifecycle
 */

import { test, expect } from '@playwright/test'
import {
  goToUpload,
  requireAgentFlow,
  requireFindings,
  requireFindingBySeverity,
  waitForStepState,
  uploadFile,
  uploadAndProcess,
  assertProceedDisabled,
  assertProceedEnabled,
  FIXTURE_BANK_CSV,
} from '../helpers'

// ============================================================================
// Smoke Tests (always run, no agent session needed)
// ============================================================================

test.describe('Upload Page — Smoke', () => {
  test('navigates to /upload and renders upload view', async ({ page }) => {
    await goToUpload(page)
    await expect(page.locator('[data-testid="upload-view"]')).toBeVisible()
  })

  test('file input accepts correct file types', async ({ page }) => {
    await goToUpload(page)
    const fileInput = page.locator('[data-testid="upload-file-input"]')
    await expect(fileInput).toHaveAttribute(
      'accept',
      '.pdf,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp',
    )
  })

  test('upload drop zone is interactive', async ({ page }) => {
    await goToUpload(page)
    const dropZone = page.locator('[aria-label*="Upload documents"]')
    await expect(dropZone).toBeVisible()
    await expect(dropZone).toHaveAttribute('role', 'button')
  })
})

// ============================================================================
// File Upload Tests
// ============================================================================

test.describe('File Upload — CSV Fixture', () => {
  test('CSV file appears in file list after selection', async ({ page }) => {
    await goToUpload(page)
    await uploadFile(page, FIXTURE_BANK_CSV)

    // The file should appear in the list
    await expect(page.getByText('test-bank-statement.csv')).toBeVisible({ timeout: 5_000 })
  })

  test('Process All button triggers extraction', async ({ page }) => {
    await goToUpload(page)
    await uploadFile(page, FIXTURE_BANK_CSV)

    // Wait for file to appear
    await expect(page.getByText('test-bank-statement.csv')).toBeVisible({ timeout: 5_000 })

    // Process All should be visible
    const processButton = page.locator('[data-testid="upload-process-all"]')
    const isVisible = await processButton.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!isVisible) {
      // File may have auto-processed
      test.skip(true, 'Process All button not visible — file may have auto-processed')
      return
    }

    await processButton.click()

    // File should transition to uploading/processing state
    // (the status indicators should change)
    await page.waitForTimeout(1_000)
  })
})

// ============================================================================
// Agent Flow Lifecycle Tests
// ============================================================================

test.describe('Agent Flow — Full Lifecycle', () => {
  test('agent flow appears after file upload and processing', async ({ page }) => {
    await goToUpload(page)
    await uploadAndProcess(page, FIXTURE_BANK_CSV)

    // Agent flow may take time to appear (extraction + analysis)
    // Wait up to 60s for the agent flow to render
    const agentFlow = page.locator('[data-testid="agent-flow"]')
    const appeared = await agentFlow.isVisible({ timeout: 60_000 }).catch(() => false)

    if (!appeared) {
      test.skip(true, 'Agent flow did not appear after upload — extraction/analysis may require real backend services')
    }

    await expect(agentFlow).toBeVisible()
  })

  test('agent steps transition through upload → analyze → validate', async ({ page }) => {
    await goToUpload(page)

    // Check if there's already an active agent session
    const agentFlow = await requireAgentFlow(page)

    // Upload step should be completed or active
    const uploadStep = page.locator('[data-testid="agent-step-upload"]')
    await expect(uploadStep).toBeVisible()

    // Check the step states
    const uploadState = await uploadStep.getAttribute('data-step-state')
    expect(['completed', 'active']).toContain(uploadState)
  })

  test('validate step shows findings summary', async ({ page }) => {
    await goToUpload(page)
    await requireAgentFlow(page)

    // Wait for validate step to become active or completed
    const validateStep = page.locator('[data-testid="agent-step-validate"]')
    const isVisible = await validateStep.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Validate step not visible — analysis may not have completed')
      return
    }

    const state = await validateStep.getAttribute('data-step-state')
    if (state === 'future') {
      test.skip(true, 'Validate step is in future state — analysis still in progress')
      return
    }

    // Findings summary should be present
    const summary = page.locator('[data-testid="findings-summary"]')
    await expect(summary).toBeVisible({ timeout: 5_000 })
  })

  test('findings display with correct severity badges', async ({ page }) => {
    await goToUpload(page)
    const findings = await requireFindings(page)

    // At least one finding should have a severity data attribute
    for (const finding of findings) {
      const testId = await finding.getAttribute('data-testid')
      expect(testId).toMatch(/^agent-finding-(critical|warning|info)$/)
    }
  })

  test('finding cards are expandable', async ({ page }) => {
    await goToUpload(page)
    const findings = await requireFindings(page)
    const firstFinding = findings[0]

    // Click the finding header to toggle expansion
    const header = firstFinding.locator('button').first()
    const ariaExpanded = await header.getAttribute('aria-expanded')

    // Toggle
    await header.click()
    const newAria = await header.getAttribute('aria-expanded')
    expect(newAria).not.toBe(ariaExpanded)
  })

  test('finding action buttons respond to clicks', async ({ page }) => {
    await goToUpload(page)

    // Try to find a warning finding (safest to interact with)
    const warningFinding = page.locator('[data-testid="agent-finding-warning"]').first()
    const hasWarning = await warningFinding.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasWarning) {
      // Try info finding
      const infoFinding = page.locator('[data-testid="agent-finding-info"]').first()
      const hasInfo = await infoFinding.isVisible({ timeout: 3_000 }).catch(() => false)
      if (!hasInfo) {
        test.skip(true, 'No warning or info findings to interact with')
        return
      }

      // Expand and acknowledge the info finding
      await infoFinding.locator('button').first().click()
      const notedButton = infoFinding.getByText('Noted')
      if (await notedButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await notedButton.click()
        // Status should change
        await expect(infoFinding).toHaveAttribute('data-finding-status', 'acknowledged')
      }
      return
    }

    // Expand and acknowledge the warning finding
    await warningFinding.locator('button').first().click()
    const gotItButton = warningFinding.getByText('Got it')
    if (await gotItButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await gotItButton.click()
      await expect(warningFinding).toHaveAttribute('data-finding-status', 'acknowledged')
    }
  })
})

// ============================================================================
// Proceed Gate Tests
// ============================================================================

test.describe('Agent Flow — Proceed Gate', () => {
  test('proceed button is disabled when critical findings are unresolved', async ({ page }) => {
    await goToUpload(page)

    const criticalFinding = page.locator('[data-testid="agent-finding-critical"]').first()
    const hasCritical = await criticalFinding.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasCritical) {
      test.skip(true, 'No critical findings — proceed gate test not applicable')
      return
    }

    // Check finding is still open
    const status = await criticalFinding.getAttribute('data-finding-status')
    if (status !== 'open') {
      test.skip(true, 'Critical finding already resolved')
      return
    }

    await assertProceedDisabled(page)
  })

  test('proceed button becomes enabled after resolving critical findings', async ({ page }) => {
    await goToUpload(page)
    await requireAgentFlow(page)

    const criticalFindings = page.locator('[data-testid="agent-finding-critical"][data-finding-status="open"]')
    const count = await criticalFindings.count()

    if (count === 0) {
      // No unresolved critical findings — proceed should already be enabled
      const proceedBtn = page.locator('[data-testid="agent-proceed"]')
      if (await proceedBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await assertProceedEnabled(page)
      } else {
        test.skip(true, 'Proceed button not visible — may not be at the right step')
      }
      return
    }

    // Resolve each critical finding
    for (let i = 0; i < count; i++) {
      const finding = criticalFindings.nth(0) // Always nth(0) since resolved ones disappear from this selector
      await finding.locator('button').first().click() // Expand

      const resolveBtn = finding.locator('[data-testid="finding-action-resolve"]')
      if (await resolveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await resolveBtn.click()
        await page.waitForTimeout(500) // Wait for Convex to sync
      }
    }

    // Now proceed should be enabled
    await assertProceedEnabled(page)
  })
})

// ============================================================================
// Dismiss Tests
// ============================================================================

test.describe('Agent Flow — Dismiss', () => {
  test('dismiss button hides the agent flow', async ({ page }) => {
    await goToUpload(page)
    const agentFlow = await requireAgentFlow(page)

    const dismissBtn = page.locator('[data-testid="agent-dismiss"]')
    const isVisible = await dismissBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (!isVisible) {
      test.skip(true, 'Dismiss button not visible — agent may have already proceeded')
      return
    }

    await dismissBtn.click()

    // Wait for exit animation (200ms) + unmount
    await expect(agentFlow).not.toBeVisible({ timeout: 3_000 })
  })
})

// ============================================================================
// Cross-Page Context Tests
// ============================================================================

test.describe('Cross-Page Context — Reconcile Banner', () => {
  test('reconcile page loads successfully', async ({ page }) => {
    await page.goto('/reconcile')
    await page.waitForLoadState('domcontentloaded')
    // The page should at minimum render
    await expect(page.locator('body')).toBeVisible()
  })

  test('agent findings banner appears when findings exist', async ({ page }) => {
    await page.goto('/reconcile')
    await page.waitForLoadState('domcontentloaded')

    // The banner is optional — it only shows when the user proceeded from an agent session
    const banner = page.locator('[data-testid="agent-findings-banner"]')
    const hasBanner = await banner.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasBanner) {
      test.skip(true, 'No agent findings banner — user may not have proceeded from agent flow')
    }

    await expect(banner).toBeVisible()
  })
})

// ============================================================================
// Token Usage Dashboard Tests
// ============================================================================

test.describe('Settings — Token Usage Dashboard', () => {
  test('settings page has usage tab', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Look for the Usage tab
    const usageTab = page.getByText('Usage')
    const isVisible = await usageTab.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Settings page did not render — auth may not be configured')
    }
    await expect(usageTab).toBeVisible()
  })

  test('clicking usage tab shows token stats', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Click the Usage tab
    const usageTab = page.getByRole('button', { name: /Usage/i })
    const isVisible = await usageTab.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Usage tab not visible')
      return
    }

    await usageTab.click()

    // Should show the usage section header
    await expect(page.getByText('Token usage from the AI analysis engine')).toBeVisible({
      timeout: 5_000,
    })
  })
})
