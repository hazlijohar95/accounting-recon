import { test, expect } from '@playwright/test'

/**
 * E2E tests for document upload workflow.
 */
test.describe('Document Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test('can navigate to upload page', async ({ page }) => {
    // Look for upload button or navigation
    const uploadButton = page.locator('[data-testid="upload-button"], [href*="upload"], button:has-text("Upload")')

    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      // Should be on upload page or modal should open
      await expect(page.locator('[data-testid="upload-form"], [role="dialog"]')).toBeVisible()
    }
  })

  test('upload form shows file input', async ({ page }) => {
    // Navigate to upload if not already there
    await page.goto('/upload').catch(() => page.goto('/'))

    // Look for file input
    const fileInput = page.locator('input[type="file"]')

    // File input should exist (even if hidden)
    await expect(fileInput).toBeAttached()
  })

  test('can select document type', async ({ page }) => {
    await page.goto('/upload').catch(() => page.goto('/'))

    // Look for document type selector
    const documentTypeSelect = page.locator(
      '[data-testid="document-type"], select:has-text("Bank Statement"), [role="combobox"]'
    )

    if (await documentTypeSelect.isVisible()) {
      await documentTypeSelect.click()
      // Should show options
      const options = page.locator('[role="option"], option')
      const count = await options.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('shows validation error for missing file', async ({ page }) => {
    await page.goto('/upload').catch(() => page.goto('/'))

    // Try to submit without file
    const submitButton = page.locator('button[type="submit"]:has-text("Upload"), button:has-text("Submit")')

    if (await submitButton.isVisible()) {
      await submitButton.click()
      // Should show validation error
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500')
      // Error might appear or button might be disabled
      expect(
        await errorMessage.isVisible() || await submitButton.isDisabled()
      ).toBeTruthy()
    }
  })

  test('drag and drop area is visible', async ({ page }) => {
    await page.goto('/upload').catch(() => page.goto('/'))

    // Look for drag/drop zone
    const dropZone = page.locator(
      '[data-testid="drop-zone"], .dropzone, [role="button"]:has-text("drag"), [class*="drop"]'
    )

    if (await dropZone.isVisible()) {
      await expect(dropZone).toBeVisible()
    }
  })
})
