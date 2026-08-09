import { test, expect } from '@playwright/test'

test.describe('DepositJudge Full Flow (Dev Mode)', () => {
  test('renders the landing page with all main elements', async ({ page }) => {
    await page.goto('/')

    // Navbar elements
    await expect(page.locator('.logo-text h1')).toHaveText('DepositJudge')
    await expect(page.locator('.tagline')).toContainText('Autonomous Real Estate Trust Protocol')
    await expect(page.locator('.btn-connect-wallet')).toBeVisible()

    // Network badge
    await expect(page.locator('.network-badge').first()).toContainText('GenLayer Studionet')

    // Ticker bar
    await expect(page.locator('.ticker-value').first()).toHaveText('$24.8M+ Eq.')

    // Property cards
    const cards = page.locator('.property-card')
    await expect(cards).toHaveCount(6)

    // Console tabs
    await expect(page.locator('.console-tab')).toHaveCount(4)
    await expect(page.locator('.console-tab').first()).toHaveClass(/active/)

    // No console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('enables Dev Mode and simulates wallet connection', async ({ page }) => {
    await page.goto('/')

    // Dev toggle should be off initially
    const devToggle = page.locator('text=DEV').first()
    await expect(devToggle).toBeVisible()

    // Click to enable Dev Mode
    await devToggle.click()

    // Should show DEV MODE text in the navbar toggle
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Wallet button should show simulated address (truncated)
    await expect(page.locator('.btn-wallet-connected')).toContainText('0xDEADBE')

    // Telemetry log should show dev mode message
    await expect(page.locator('.glass-panel').last().locator('text=Dev Mode')).toBeVisible()
  })

  test('creates escrow in Dev Mode and navigates to Evidence tab', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Auto-fill demo data
    await page.locator('text=Auto-fill Demo Data').first().click()

    // Verify form fields are populated
    const escrowIdInput = page.locator('#escrow-id')
    await expect(escrowIdInput).not.toHaveValue('')

    const amountInput = page.locator('#deposit-amount')
    await expect(amountInput).not.toHaveValue('')

    // Click Deploy & Lock
    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Wait for mock transaction (1.5s delay)
    await page.waitForTimeout(2500)

    // Should navigate to Evidence tab
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)

    // Live Escrow Tracker should show active escrow
    await expect(page.locator('.network-badge').filter({ hasText: 'ACTIVE' })).toBeVisible()
  })

  test('submits evidence in Dev Mode and navigates to Judge tab', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Create escrow first
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    // Should be on Evidence tab now
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)

    // Auto-fill evidence data
    await page.locator('text=Auto-fill Demo Data').first().click()

    // Verify evidence fields are populated
    await expect(page.locator('#listing-url')).not.toHaveValue('')
    await expect(page.locator('#inspection-notes')).not.toHaveValue('')

    // Submit evidence
    await page.locator('button:has-text("Submit & Seal")').click()

    // Wait for mock submission (1.2s delay)
    await page.waitForTimeout(2000)

    // Should navigate to Judge tab
    await expect(page.locator('.console-tab').nth(2)).toHaveClass(/active/)
  })

  test('resolves dispute in Dev Mode and shows verdict', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Create escrow
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    // Submit evidence
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('button:has-text("Submit & Seal")').click()
    await page.waitForTimeout(2000)

    // Should be on Judge tab
    await expect(page.locator('.console-tab').nth(2)).toHaveClass(/active/)

    // Click Invoke AI Judge
    await page.locator('text=Invoke AI Supreme Judge').click()

    // Wait for mock AI resolution (4.5s total delay)
    await page.waitForTimeout(6000)

    // Verdict box should appear
    await expect(page.locator('.verdict-box')).toBeVisible()

    // Verdict should be one of the expected values
    const verdictText = await page.locator('.verdict-box h3').textContent()
    expect(verdictText).toMatch(/NORMAL_WEAR|DAMAGE|DISPUTE_ESCALATE/)

    // Payout amounts should be visible
    await expect(page.locator('.verdict-box')).toContainText('Landlord Compensation')
    await expect(page.locator('.verdict-box')).toContainText('Tenant Refund')
  })

  test('completes the full end-to-end Dev Mode flow', async ({ page }) => {
    await page.goto('/')

    // 1. Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // 2. Auto-fill and create escrow
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    // 3. Auto-fill and submit evidence
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('button:has-text("Submit & Seal")').click()
    await page.waitForTimeout(2000)

    // 4. Resolve dispute
    await page.locator('text=Invoke AI Supreme Judge').click()
    await page.waitForTimeout(6000)

    // 5. Verify final state
    await expect(page.locator('.verdict-box')).toBeVisible()

    // Check telemetry log has all dev mode messages
    const logPanel = page.locator('.glass-panel').last().locator('div').filter({ hasText: 'Dev Mode' })
    const logCount = await logPanel.count()
    expect(logCount).toBeGreaterThanOrEqual(3) // escrow, evidence, resolution

    // Take a screenshot of the final state
    await page.screenshot({ path: 'e2e/screenshots/full-flow-result.png', fullPage: true })
  })

  test('disables Dev Mode and disconnects wallet', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()
    await expect(page.locator('.btn-wallet-connected')).toBeVisible()

    // Disable Dev Mode by clicking the toggle
    await page.getByText('DEV MODE', { exact: true }).click()

    // Should show connect wallet button again
    await expect(page.locator('.btn-connect-wallet')).toContainText('Connect Web3 Wallet')

    // Profile tab should show restricted state
    await page.locator('text=Executive Profile').click()
    await expect(page.locator('text=Vault Access Restricted')).toBeVisible()
  })

  test('property cards load escrow form correctly', async ({ page }) => {
    await page.goto('/')

    // Click on a property card's lease button
    const firstLeaseBtn = page.locator('.btn-lease').first()
    await firstLeaseBtn.click()

    // Should switch to Create tab
    await expect(page.locator('.console-tab').first()).toHaveClass(/active/)

    // Form should be populated with property data
    await expect(page.locator('#escrow-id')).not.toHaveValue('')
    await expect(page.locator('#landlord-addr')).not.toHaveValue('')
    await expect(page.locator('#deposit-amount')).not.toHaveValue('')
  })
})
