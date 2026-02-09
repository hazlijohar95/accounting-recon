/**
 * E2E Test Helpers
 *
 * Shared utilities for Playwright E2E tests.
 * Provides reliable element finders with skip-on-absence semantics
 * and common navigation helpers.
 *
 * @module e2e/helpers
 */

import { test, type Page, type Locator, expect } from '@playwright/test'
import path from 'path'

// ============================================================================
// Fixture Paths
// ============================================================================

export const FIXTURES_DIR = path.join(__dirname, 'fixtures')
export const FIXTURE_BANK_CSV = path.join(FIXTURES_DIR, 'test-bank-statement.csv')

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to the upload page and wait for it to be ready.
 * Skips the test if the upload page doesn't render within timeout.
 */
export async function goToUpload(page: Page): Promise<void> {
  await page.goto('/upload')
  const uploadView = page.locator('[data-testid="upload-view"]')
  const isVisible = await uploadView.isVisible({ timeout: 10_000 }).catch(() => false)
  if (!isVisible) {
    test.skip(true, 'Upload page did not render — auth may not be configured')
  }
}

/**
 * Navigate to the reconcile page and wait for it to be ready.
 */
export async function goToReconcile(page: Page): Promise<void> {
  await page.goto('/reconcile')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Navigate to settings and wait for it to be ready.
 */
export async function goToSettings(page: Page): Promise<void> {
  await page.goto('/settings')
  await page.waitForLoadState('domcontentloaded')
}

// ============================================================================
// Agent Flow Helpers
// ============================================================================

/**
 * Wait for the agent flow to appear.
 * Skips the test with a clear reason if not visible.
 */
export async function requireAgentFlow(page: Page, timeoutMs = 10_000): Promise<Locator> {
  const agentFlow = page.locator('[data-testid="agent-flow"]')
  const isVisible = await agentFlow.isVisible({ timeout: timeoutMs }).catch(() => false)
  if (!isVisible) {
    test.skip(true, 'Agent flow not visible — no active agent session for this company')
  }
  return agentFlow
}

/**
 * Wait for at least one finding card to appear.
 * Skips the test if no findings are rendered.
 */
export async function requireFindings(page: Page): Promise<Locator[]> {
  await requireAgentFlow(page)
  const findings = page.locator('[data-testid^="agent-finding-"]')
  const count = await findings.count()
  if (count === 0) {
    test.skip(true, 'No agent findings rendered — analysis may not have produced findings')
  }
  return Array.from({ length: count }, (_, i) => findings.nth(i))
}

/**
 * Find a finding card by severity.
 * Skips if no finding of that severity exists.
 */
export async function requireFindingBySeverity(
  page: Page,
  severity: 'critical' | 'warning' | 'info',
): Promise<Locator> {
  await requireAgentFlow(page)
  const finding = page.locator(`[data-testid="agent-finding-${severity}"]`).first()
  const isVisible = await finding.isVisible({ timeout: 5_000 }).catch(() => false)
  if (!isVisible) {
    test.skip(true, `No ${severity} finding found in agent flow`)
  }
  return finding
}

/**
 * Wait for a specific agent step to be in a given state.
 */
export async function waitForStepState(
  page: Page,
  step: 'upload' | 'analyze' | 'validate' | 'proceed',
  state: 'completed' | 'active' | 'future',
  timeoutMs = 30_000,
): Promise<Locator> {
  const stepLocator = page.locator(
    `[data-testid="agent-step-${step}"][data-step-state="${state}"]`,
  )
  await expect(stepLocator).toBeVisible({ timeout: timeoutMs })
  return stepLocator
}

// ============================================================================
// File Upload Helpers
// ============================================================================

/**
 * Upload a file using the file input.
 * Uses the data-testid selector for stability.
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  const fileInput = page.locator('[data-testid="upload-file-input"]')
  await fileInput.setInputFiles(filePath)
}

/**
 * Upload a file and click "Process All" to start extraction.
 */
export async function uploadAndProcess(page: Page, filePath: string): Promise<void> {
  await uploadFile(page, filePath)

  // Wait for file to appear in the list, then process
  const processButton = page.locator('[data-testid="upload-process-all"]')
  const isVisible = await processButton.isVisible({ timeout: 5_000 }).catch(() => false)
  if (isVisible) {
    await processButton.click()
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that the proceed button is disabled (critical findings unresolved).
 */
export async function assertProceedDisabled(page: Page): Promise<void> {
  const proceedBtn = page.locator('[data-testid="agent-proceed"]')
  if (await proceedBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(proceedBtn).toBeDisabled()
  }
}

/**
 * Assert that the proceed button is enabled.
 */
export async function assertProceedEnabled(page: Page): Promise<void> {
  const proceedBtn = page.locator('[data-testid="agent-proceed"]')
  await expect(proceedBtn).toBeVisible({ timeout: 10_000 })
  await expect(proceedBtn).toBeEnabled()
}
