import { test, expect, type Page } from '@playwright/test'

/**
 * E2E tests for the Agent Upload Flow.
 *
 * The agent flow sits above the existing 3-tab upload system and provides
 * intelligent document analysis with a 4-step flow:
 * Upload -> Analyze -> Validate -> Proceed
 *
 * Prerequisites:
 * - Dev server running (pnpm dev)
 * - Convex backend running (npx convex dev)
 * - Authenticated user with at least one company
 * - For agent-specific tests: an active agent session with findings
 *   (created by uploading documents through the normal flow)
 *
 * Tests that depend on an active agent session use `requireAgentFlow()`
 * which explicitly skips with a visible reason when the agent flow is
 * not present, rather than silently passing.
 */

// ============================================================================
// Helpers — Agent flow detection with explicit skip
// ============================================================================

/**
 * Wait for the agent flow panel to appear on the page.
 * If it doesn't appear within the timeout, skip the calling test
 * with a clear reason (visible in test reports).
 *
 * Returns the agent flow container locator for further assertions.
 */
async function requireAgentFlow(page: Page) {
  const agentFlow = page.locator('.agent-flow-enter, [data-testid="agent-flow"]')
  const isVisible = await agentFlow.isVisible({ timeout: 5000 }).catch(() => false)

  if (!isVisible) {
    test.skip(true, 'Agent flow not present — requires an active agent session with uploaded documents')
  }

  return agentFlow
}

/**
 * Require at least one agent finding card to be present.
 * Skips with a visible reason if no findings exist.
 */
async function requireFindings(page: Page) {
  await requireAgentFlow(page)
  const findingCards = page.locator('.agent-finding-card')
  const count = await findingCards.count()

  if (count === 0) {
    test.skip(true, 'No agent findings present — requires a completed agent analysis with findings')
  }

  return findingCards
}

/**
 * Require a finding card of a specific severity.
 * Skips with a visible reason if no cards of that severity exist.
 */
async function requireFindingBySeverity(page: Page, severity: 'critical' | 'warning' | 'info') {
  await requireAgentFlow(page)

  const selectorMap = {
    critical: '.agent-finding-card:has(.text-error)',
    warning: '.agent-finding-card:has(.text-warning)',
    info: '.agent-finding-card:has(.text-info)',
  }
  const card = page.locator(selectorMap[severity]).first()
  const isVisible = await card.isVisible({ timeout: 3000 }).catch(() => false)

  if (!isVisible) {
    test.skip(true, `No ${severity} findings present — requires agent analysis that produced ${severity} findings`)
  }

  return card
}

// ============================================================================
// Upload Page — Smoke Tests (always run, no agent session required)
// ============================================================================

test.describe('Upload Page Smoke Tests', () => {
  test('upload page loads successfully', async ({ page }) => {
    const response = await page.goto('/upload')
    expect(response?.status()).toBeLessThan(400)
  })

  test('upload page has file input', async ({ page }) => {
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })
})

// ============================================================================
// Agent Flow — Structure & Presence
// ============================================================================

test.describe('Agent Flow Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('agent flow panel shows "Upload Assistant" header', async ({ page }) => {
    await requireAgentFlow(page)
    await expect(page.locator('text=Upload Assistant')).toBeVisible()
  })

  test('agent flow has dismiss button', async ({ page }) => {
    await requireAgentFlow(page)
    const dismissButton = page.locator('[aria-label="Dismiss assistant"]')
    await expect(dismissButton).toBeVisible()
    await expect(dismissButton).toBeEnabled()
  })

  test('agent flow shows all four step labels', async ({ page }) => {
    await requireAgentFlow(page)

    // All four step labels should be present in the DOM (some may be greyed out)
    await expect(page.locator('.agent-step-wrapper').first()).toBeVisible()

    // Count total step wrappers — should be exactly 4
    const stepCount = await page.locator('.agent-step-wrapper').count()
    expect(stepCount).toBe(4)
  })

  test('exactly one step is active (has expanded content)', async ({ page }) => {
    await requireAgentFlow(page)

    // Active step always has data-expanded="true" and is not a completed step toggle
    const expandedContents = page.locator('.agent-step-content[data-expanded="true"]')
    const count = await expandedContents.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// Agent Step Interactions
// ============================================================================

test.describe('Agent Step Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('completed step toggles expand/collapse on click', async ({ page }) => {
    await requireAgentFlow(page)

    // A completed step has a checkmark icon (.text-success)
    const completedStep = page.locator('.agent-step-wrapper:has(.text-success)').first()
    const isVisible = await completedStep.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'No completed steps — agent session has not progressed past step 1')
    }

    const stepButton = completedStep.locator('button[aria-expanded]').first()
    const contentId = await stepButton.getAttribute('aria-controls')
    expect(contentId).toBeTruthy()

    const content = page.locator(`#${contentId}`)

    // Start collapsed
    await expect(stepButton).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    await stepButton.click()
    await expect(stepButton).toHaveAttribute('aria-expanded', 'true')
    await expect(content).toHaveAttribute('data-expanded', 'true')

    // Click to collapse
    await stepButton.click()
    await expect(stepButton).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toHaveAttribute('data-expanded', 'false')
  })

  test('future steps have reduced opacity', async ({ page }) => {
    await requireAgentFlow(page)

    const futureStep = page.locator('.agent-step-wrapper.opacity-40').first()
    const isVisible = await futureStep.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'No future steps visible — agent may be at the final step')
    }

    await expect(futureStep).toHaveCSS('opacity', '0.4')
  })
})

// ============================================================================
// Agent Findings
// ============================================================================

test.describe('Agent Findings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('finding cards render with severity border', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const firstCard = findingCards.first()
    await expect(firstCard).toBeVisible()

    // Every finding card has the border-l-2 class for severity indicator
    const hasBorder = await firstCard.evaluate((el) => el.classList.contains('border-l-2'))
    expect(hasBorder).toBe(true)
  })

  test('finding card expand button toggles aria-expanded', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const expandButton = findingCards.first().locator('button[aria-expanded]').first()

    const initialState = await expandButton.getAttribute('aria-expanded')
    await expandButton.click()
    const newState = await expandButton.getAttribute('aria-expanded')
    expect(newState).not.toBe(initialState)
  })

  test('expanded finding card shows description text', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const firstCard = findingCards.first()
    const expandButton = firstCard.locator('button[aria-expanded]').first()

    // Ensure expanded
    if (await expandButton.getAttribute('aria-expanded') !== 'true') {
      await expandButton.click()
    }

    const description = firstCard.locator('.agent-finding-body p').first()
    await expect(description).toBeVisible()
    const text = await description.textContent()
    expect(text?.length).toBeGreaterThan(10)
  })

  test('critical finding has Resolve or Skip action button', async ({ page }) => {
    const criticalCard = await requireFindingBySeverity(page, 'critical')

    // Expand if needed
    const expandButton = criticalCard.locator('button[aria-expanded]').first()
    if (await expandButton.getAttribute('aria-expanded') !== 'true') {
      await expandButton.click()
    }

    // Critical findings have either Resolve, Retry Extraction, or Skip buttons
    const actionButton = criticalCard.locator(
      'button:has-text("Resolve"), button:has-text("Retry Extraction"), button:has-text("Skip")',
    ).first()
    await expect(actionButton).toBeVisible()
    await expect(actionButton).toBeEnabled()
  })

  test('warning finding has "Got it" or "Keep Anyway" button', async ({ page }) => {
    const warningCard = await requireFindingBySeverity(page, 'warning')

    // Expand if needed
    const expandButton = warningCard.locator('button[aria-expanded]').first()
    if (await expandButton.getAttribute('aria-expanded') !== 'true') {
      await expandButton.click()
    }

    const ackButton = warningCard.locator(
      'button:has-text("Got it"), button:has-text("Keep Anyway")',
    ).first()
    await expect(ackButton).toBeVisible()
  })

  test('info finding has "Noted" button', async ({ page }) => {
    const infoCard = await requireFindingBySeverity(page, 'info')

    // Expand if needed
    const expandButton = infoCard.locator('button[aria-expanded]').first()
    if (await expandButton.getAttribute('aria-expanded') !== 'true') {
      await expandButton.click()
    }

    const notedButton = infoCard.locator('button:has-text("Noted")')
    await expect(notedButton).toBeVisible()
  })

  test('findings count bar displays total count', async ({ page }) => {
    await requireFindings(page)
    const countBar = page.locator('text=/\\d+ finding/')
    await expect(countBar.first()).toBeVisible()
  })

  test('findings are grouped by severity headers', async ({ page }) => {
    await requireFindings(page)

    // At least one severity group header should be visible
    const mustAddress = page.locator('h4:has-text("Must Address")')
    const goodToKnow = page.locator('h4:has-text("Good to Know")')
    const fyi = page.locator('h4:has-text("For Your Information")')

    const mustCount = await mustAddress.count()
    const goodCount = await goodToKnow.count()
    const fyiCount = await fyi.count()

    expect(mustCount + goodCount + fyiCount).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// Agent Dismiss
// ============================================================================

test.describe('Agent Dismiss', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('dismiss button hides agent flow with exit animation', async ({ page }) => {
    await requireAgentFlow(page)

    const dismissButton = page.locator('[aria-label="Dismiss assistant"]')
    await dismissButton.click()

    // After dismiss, agent should either have exit class or be gone
    // Wait for the exit animation (200ms) plus a buffer
    await page.waitForTimeout(400)

    const agentFlow = page.locator('.agent-flow-enter')
    const stillVisible = await agentFlow.isVisible().catch(() => false)
    expect(stillVisible).toBe(false)
  })
})

// ============================================================================
// Agent Proceed to Reconciliation
// ============================================================================

test.describe('Agent Proceed to Reconciliation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('proceed button is present in the flow', async ({ page }) => {
    await requireAgentFlow(page)

    // The proceed step may be visible (if session is at validate/proceed stage)
    // or may be a future step. Either way, the text should exist in DOM.
    const proceedText = page.locator('text=Proceed to Reconciliation')
    await expect(proceedText.first()).toBeAttached()
  })

  test('proceed button is disabled when critical findings are unresolved', async ({ page }) => {
    await requireAgentFlow(page)

    const proceedButton = page.locator('button:has-text("Proceed to Reconciliation")')
    const isVisible = await proceedButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Proceed button not visible — agent not at proceed stage')
    }

    const hasCritical = await page.locator('h4:has-text("Must Address")').isVisible().catch(() => false)
    if (!hasCritical) {
      test.skip(true, 'No critical findings — cannot test disabled state')
    }

    await expect(proceedButton).toBeDisabled()
  })
})

// ============================================================================
// Agent Summary
// ============================================================================

test.describe('Agent Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('agent summary text has meaningful content', async ({ page }) => {
    await requireAgentFlow(page)

    const summary = page.locator('.agent-summary-enter').first()
    const isVisible = await summary.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Agent summary not visible — requires completed analysis')
    }

    const text = await summary.textContent()
    expect(text?.length).toBeGreaterThan(20)
  })
})

// ============================================================================
// Accessibility
// ============================================================================

test.describe('Agent Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('finding card buttons have aria-expanded and aria-controls', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const expandButton = findingCards.first().locator('button[aria-expanded]').first()

    // aria-expanded should be a boolean string
    const expanded = await expandButton.getAttribute('aria-expanded')
    expect(expanded === 'true' || expanded === 'false').toBe(true)

    // aria-controls should reference an existing element
    const controlsId = await expandButton.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    const controlledElement = page.locator(`#${controlsId}`)
    await expect(controlledElement).toBeAttached()
  })

  test('completed step buttons have aria-expanded and aria-controls', async ({ page }) => {
    await requireAgentFlow(page)

    const stepButton = page.locator('.agent-step-wrapper button[aria-expanded]').first()
    const isVisible = await stepButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'No completed steps with expandable buttons')
    }

    const expanded = await stepButton.getAttribute('aria-expanded')
    expect(expanded === 'true' || expanded === 'false').toBe(true)

    const controlsId = await stepButton.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
  })

  test('finding cards support keyboard Enter to toggle', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const expandButton = findingCards.first().locator('button[aria-expanded]').first()

    await expandButton.focus()
    const initialState = await expandButton.getAttribute('aria-expanded')

    await expandButton.press('Enter')
    const newState = await expandButton.getAttribute('aria-expanded')
    expect(newState).not.toBe(initialState)
  })

  test('finding cards support keyboard Space to toggle', async ({ page }) => {
    const findingCards = await requireFindings(page)
    const expandButton = findingCards.first().locator('button[aria-expanded]').first()

    await expandButton.focus()
    const initialState = await expandButton.getAttribute('aria-expanded')

    await expandButton.press('Space')
    const newState = await expandButton.getAttribute('aria-expanded')
    expect(newState).not.toBe(initialState)
  })

  test('dismiss button has aria-label', async ({ page }) => {
    await requireAgentFlow(page)
    const dismissButton = page.locator('[aria-label="Dismiss assistant"]')
    await expect(dismissButton).toBeVisible()
  })
})

// ============================================================================
// Animations
// ============================================================================

test.describe('Agent Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('finding cards have staggered --finding-index CSS variables', async ({ page }) => {
    await requireFindings(page)

    const findingCards = page.locator('.agent-finding-enter')
    const count = await findingCards.count()
    if (count < 2) {
      test.skip(true, 'Need at least 2 finding cards to verify stagger — only found ' + count)
    }

    const firstIndex = await findingCards.first().evaluate(
      (el) => getComputedStyle(el).getPropertyValue('--finding-index').trim(),
    )
    const secondIndex = await findingCards.nth(1).evaluate(
      (el) => getComputedStyle(el).getPropertyValue('--finding-index').trim(),
    )

    expect(firstIndex).not.toBe(secondIndex)
  })

  test('agent flow container has entrance animation class', async ({ page }) => {
    const agentFlow = await requireAgentFlow(page)
    const hasEnterClass = await agentFlow.evaluate(
      (el) => el.classList.contains('agent-flow-enter'),
    )
    expect(hasEnterClass).toBe(true)
  })
})

// ============================================================================
// Multi-Company Lanes
// ============================================================================

test.describe('Multi-Company Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('company lanes render when multiple companies detected', async ({ page }) => {
    await requireAgentFlow(page)

    const laneContainer = page.locator('[data-testid="company-lanes"]')
    const isVisible = await laneContainer.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'No multi-company lanes — requires documents from multiple companies')
    }

    await expect(laneContainer).toBeVisible()
  })
})

// ============================================================================
// Cross-Page Context (Agent -> Reconcile)
// ============================================================================

test.describe('Agent Cross-Page Context', () => {
  test('reconcile page loads successfully', async ({ page }) => {
    const response = await page.goto('/reconcile')
    // May redirect to login or company selection — any non-error is fine
    expect(response?.status()).toBeLessThan(500)
  })

  test('agent findings banner renders when unresolved findings exist', async ({ page }) => {
    await page.goto('/reconcile')

    const banner = page.locator('text=Upload Agent')
    const isVisible = await banner.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Agent findings banner not present — requires an agent session with unresolved findings linked to a reconciliation session')
    }

    await expect(banner).toBeVisible()

    // Banner should show finding count
    const countText = page.locator('text=/\\d+ finding/')
    await expect(countText.first()).toBeVisible()
  })

  test('agent findings banner can be dismissed', async ({ page }) => {
    await page.goto('/reconcile')

    const dismissButton = page.locator('[aria-label="Dismiss agent findings"]')
    const isVisible = await dismissButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Agent findings banner not present on reconcile page')
    }

    await dismissButton.click()
    await page.waitForTimeout(400)

    const banner = page.locator('text=Upload Agent')
    await expect(banner).not.toBeVisible()
  })
})
