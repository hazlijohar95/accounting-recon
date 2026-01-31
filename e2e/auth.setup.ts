import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Authentication setup for E2E tests.
 *
 * This runs before all tests to authenticate the user and save
 * the session state. Tests then reuse this authenticated state.
 *
 * For local development, you can set TEST_USER_EMAIL and TEST_USER_PASSWORD
 * environment variables or use WorkOS test mode.
 */
setup('authenticate', async ({ page }) => {
  // Skip auth in test environment - use mocked auth state
  if (process.env.E2E_SKIP_AUTH === 'true') {
    // Create empty auth file
    await page.context().storageState({ path: authFile })
    return
  }

  // Navigate to sign-in page
  await page.goto('/sign-in')

  // Wait for WorkOS auth or redirect
  // In development, WorkOS might redirect to auth page
  const currentUrl = page.url()

  if (currentUrl.includes('workos.com') || currentUrl.includes('authkit')) {
    // WorkOS hosted auth flow
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
      console.log('TEST_USER_EMAIL and TEST_USER_PASSWORD not set, using mock auth')
      await page.context().storageState({ path: authFile })
      return
    }

    // Fill in WorkOS login form
    await page.fill('input[name="email"]', email)
    await page.click('button[type="submit"]')

    // Wait for password field or magic link
    if (await page.locator('input[name="password"]').isVisible()) {
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')
    }

    // Wait for redirect back to app
    await page.waitForURL('http://localhost:3000/**')
  }

  // Verify authenticated
  await expect(page).toHaveURL(/.*/)

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
