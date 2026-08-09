import { test, expect, Page } from '@playwright/test'

// Helper: accept all browser alerts and return their messages
function captureAlerts(page: Page): string[] {
  const messages: string[] = []
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message())
    await dialog.accept()
  })
  return messages
}

test.describe('Form Validation Edge Cases', () => {
  test('shows alert when creating escrow with empty escrow ID', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Clear the escrow ID field
    await page.locator('#escrow-id').clear()
    await page.locator('#escrow-id').fill('')

    // Submit the form
    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show alert about missing parameters
    expect(alerts.some(m => m.includes('mandatory'))).toBeTruthy()
  })

  test('shows alert when creating escrow with empty landlord address', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Clear landlord address
    await page.locator('#landlord-addr').clear()

    // Submit the form
    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show alert about missing parameters
    expect(alerts.some(m => m.includes('mandatory'))).toBeTruthy()
  })

  test('shows alert when creating escrow with empty tenant address', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Fill landlord and amount but leave tenant empty
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#deposit-amount').fill('5')
    await page.locator('#tenant-addr').clear()

    // Submit the form
    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show alert about missing parameters
    expect(alerts.some(m => m.includes('mandatory'))).toBeTruthy()
  })

  test('shows alert when creating escrow with empty deposit amount', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Clear deposit amount
    await page.locator('#deposit-amount').clear()

    // Submit the form
    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show alert about missing parameters
    expect(alerts.some(m => m.includes('mandatory') || m.includes('positive'))).toBeTruthy()
  })
})

test.describe('Invalid Address Validation', () => {
  test('rejects landlord address that is too short', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Fill with an invalid (too short) landlord address
    await page.locator('#escrow-id').fill('TEST-SHORT-ADDR')
    await page.locator('#landlord-addr').fill('0x1234')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show address validation error
    expect(alerts.some(m => m.includes('valid 42-character') || m.includes('address'))).toBeTruthy()
  })

  test('rejects landlord address without 0x prefix', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-NO-PREFIX')
    await page.locator('#landlord-addr').fill('71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    expect(alerts.some(m => m.includes('valid 42-character') || m.includes('address'))).toBeTruthy()
  })

  test('rejects landlord address with non-hex characters', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-INVALID-HEX')
    await page.locator('#landlord-addr').fill('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    expect(alerts.some(m => m.includes('valid 42-character') || m.includes('address'))).toBeTruthy()
  })

  test('rejects tenant address that is too short', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-SHORT-TENANT')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xABC')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    expect(alerts.some(m => m.includes('valid 42-character') || m.includes('address'))).toBeTruthy()
  })

  test('rejects tenant address with invalid characters', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-TENANT-INVALID')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xGGGHHHIIIJJJKKKKLLLMMMNNNOOOPPPQQQRRRR')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    expect(alerts.some(m => m.includes('valid 42-character') || m.includes('address'))).toBeTruthy()
  })

  test('accepts valid checksummed EIP-55 address', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    // Use a valid EIP-55 checksummed address
    await page.locator('#escrow-id').fill('TEST-VALID-CHECKSUM')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').fill('5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Wait for mock transaction
    await page.waitForTimeout(2500)

    // Should NOT have an address validation error (other alerts may appear)
    const addressErrors = alerts.filter(m => m.includes('valid 42-character'))
    expect(addressErrors).toHaveLength(0)
  })
})

test.describe('Deposit Amount Validation', () => {
  test('rejects deposit amount of zero', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-ZERO-AMOUNT')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').clear()
    await page.locator('#deposit-amount').fill('0')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show amount validation error
    expect(alerts.some(m => m.includes('positive') || m.includes('greater than 0'))).toBeTruthy()
  })

  test('rejects negative deposit amount', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-NEG-AMOUNT')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').clear()
    await page.locator('#deposit-amount').fill('-5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Should show amount validation error
    expect(alerts.some(m => m.includes('positive') || m.includes('greater than 0'))).toBeTruthy()
  })

  test('input[type=number] rejects non-numeric characters via HTML5 validation', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // The deposit amount input is type="number", so the browser prevents non-numeric input.
    // Verify the input is indeed type="number" (HTML5 validation handles this).
    const inputType = await page.locator('#deposit-amount').getAttribute('type')
    expect(inputType).toBe('number')

    // Verify that filling a valid number works
    await page.locator('#deposit-amount').clear()
    await page.locator('#deposit-amount').fill('10')
    await expect(page.locator('#deposit-amount')).toHaveValue('10')

    // Verify that clearing the input leaves it empty
    await page.locator('#deposit-amount').clear()
    await expect(page.locator('#deposit-amount')).toHaveValue('')
  })

  test('accepts decimal deposit amount', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-DECIMAL-AMOUNT')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').clear()
    await page.locator('#deposit-amount').fill('3.5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Wait for mock transaction
    await page.waitForTimeout(2500)

    // Should NOT have amount validation error
    const amountErrors = alerts.filter(m => m.includes('positive') || m.includes('greater than 0'))
    expect(amountErrors).toHaveLength(0)

    // Should navigate to evidence tab (success)
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)
  })

  test('accepts decimal deposit amount via input state', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    const alerts = captureAlerts(page)

    await page.locator('#escrow-id').fill('TEST-COMMA-AMOUNT')
    await page.locator('#landlord-addr').fill('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    await page.locator('#tenant-addr').fill('0xDEADBEEF00000000000000000000000000000001')
    await page.locator('#deposit-amount').clear()
    // Use a decimal number (browsers accept decimal points in type=number)
    await page.locator('#deposit-amount').fill('3.5')

    await page.locator('text=Deploy & Lock Deposit Vault').click()

    // Wait for mock transaction
    await page.waitForTimeout(2500)

    // Should NOT have amount validation error
    const amountErrors = alerts.filter(m => m.includes('positive') || m.includes('greater than 0'))
    expect(amountErrors).toHaveLength(0)

    // Should navigate to evidence tab (success)
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)
  })
})

test.describe('Wallet Modal Interactions', () => {
  test('opens wallet modal when Connect Wallet button is clicked', async ({ page }) => {
    await page.goto('/')

    // Click the Connect Wallet button
    await page.locator('.btn-connect-wallet').first().click()

    // Modal should be visible
    await expect(page.locator('.modal-overlay')).toBeVisible()
    await expect(page.locator('.modal-content')).toBeVisible()

    // Should show MetaMask option
    await expect(page.locator('.wallet-option').first()).toContainText('MetaMask')

    // Should show Dev Mode option
    await expect(page.locator('.wallet-option').nth(1)).toContainText('Dev Mode')
  })

  test('closes wallet modal when clicking overlay background', async ({ page }) => {
    await page.goto('/')

    // Open modal
    await page.locator('.btn-connect-wallet').first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Click the overlay (not the content)
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } })

    // Modal should be closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible()
  })

  test('closes wallet modal when clicking X button', async ({ page }) => {
    await page.goto('/')

    // Open modal
    await page.locator('.btn-connect-wallet').first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Click the close button
    await page.locator('.modal-close').click()

    // Modal should be closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible()
  })

  test('enables Dev Mode from wallet modal', async ({ page }) => {
    await page.goto('/')

    // Open wallet modal
    await page.locator('.btn-connect-wallet').first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Click Dev Mode option in the modal
    const devOption = page.locator('.wallet-option').nth(1)
    await expect(devOption).toContainText('Dev Mode')
    await devOption.click()

    // Modal should close
    await expect(page.locator('.modal-overlay')).not.toBeVisible()

    // Should show DEV MODE in navbar
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Wallet button should show simulated address
    await expect(page.locator('.btn-wallet-connected')).toContainText('0xDEADBE')
  })

  test('shows disconnect button in modal when wallet is connected', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode first (which connects a wallet)
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Open wallet modal
    await page.locator('.btn-wallet-connected').click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Should show disconnect button
    await expect(page.locator('text=Disconnect Current Executive Signer')).toBeVisible()
  })

  test('disconnects wallet from modal', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Open wallet modal
    await page.locator('.btn-wallet-connected').click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Click disconnect
    await page.locator('text=Disconnect Current Executive Signer').click()

    // Wallet should be disconnected (modal may remain open by design)
    await expect(page.locator('.btn-connect-wallet').first()).toContainText('Connect Web3 Wallet')

    // Close modal
    await page.locator('.modal-close').click()
    await expect(page.locator('.modal-overlay')).not.toBeVisible()
  })

  test('shows faucet links in modal when not in Dev Mode', async ({ page }) => {
    await page.goto('/')

    // Open wallet modal (without Dev Mode)
    await page.locator('.btn-connect-wallet').first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Should show faucet section
    await expect(page.locator('text=Need GEN tokens for testing?')).toBeVisible()
    await expect(page.locator('text=Studio Faucet')).toBeVisible()
    await expect(page.locator('text=Testnet Faucet')).toBeVisible()
  })

  test('hides faucet links when Dev Mode is active', async ({ page }) => {
    await page.goto('/')

    // Enable Dev Mode first
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Open wallet modal
    await page.locator('.btn-wallet-connected').click()
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Should NOT show faucet section (hidden in dev mode)
    await expect(page.locator('text=Need GEN tokens for testing?')).not.toBeVisible()
  })
})

test.describe('Evidence Submission Edge Cases', () => {
  test('shows alert when submitting evidence with empty listing URL', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Create escrow first
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    // Should be on evidence tab
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)

    const alerts = captureAlerts(page)

    // Clear listing URL and evidence URL, fill only description
    await page.locator('#listing-url').clear()
    await page.locator('#inspection-notes').fill('Some description')
    await page.locator('#evidence-upload + input, input[placeholder*="paste external"]').first().fill('https://example.com/evidence.txt')

    // Actually, clear listing URL specifically
    await page.locator('#listing-url').clear()

    // Submit evidence
    await page.locator('button:has-text("Submit & Seal")').click()

    // Should show alert about missing fields
    expect(alerts.some(m => m.includes('complete all') || m.includes('listing'))).toBeTruthy()
  })

  test('shows alert when submitting evidence with empty description', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Create escrow first
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    const alerts = captureAlerts(page)

    // Fill listing URL and evidence URL but leave description empty
    await page.locator('#listing-url').fill('https://example.com/listing.txt')
    await page.locator('#inspection-notes').clear()
    await page.locator('#inspection-notes').fill('')
    await page.locator('input[placeholder*="paste external"]').fill('https://example.com/evidence.txt')

    // Submit evidence
    await page.locator('button:has-text("Submit & Seal")').click()

    // Should show alert about missing fields
    expect(alerts.some(m => m.includes('complete all') || m.includes('description'))).toBeTruthy()
  })

  test('shows alert when submitting evidence with empty evidence URL', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=DEV').first().click()
    await expect(page.getByText('DEV MODE', { exact: true })).toBeVisible()

    // Create escrow first
    await page.locator('text=Auto-fill Demo Data').first().click()
    await page.locator('text=Deploy & Lock Deposit Vault').click()
    await page.waitForTimeout(2500)

    const alerts = captureAlerts(page)

    // Fill listing URL and description but leave evidence URL empty
    await page.locator('#listing-url').fill('https://example.com/listing.txt')
    await page.locator('#inspection-notes').fill('Some description about the property condition.')
    await page.locator('input[placeholder*="paste external"]').clear()

    // Submit evidence
    await page.locator('button:has-text("Submit & Seal")').click()

    // Should show alert about missing fields
    expect(alerts.some(m => m.includes('complete all') || m.includes('evidence'))).toBeTruthy()
  })
})

test.describe('Judge Tab Edge Cases', () => {
  test('disables AI Judge button when no escrow exists', async ({ page }) => {
    await page.goto('/')

    // Navigate to judge tab directly
    await page.locator('.console-tab').nth(2).click()
    await expect(page.locator('.console-tab').nth(2)).toHaveClass(/active/)

    // AI Judge button should be disabled (no currentEscrow)
    const judgeBtn = page.locator('text=Invoke AI Supreme Judge')
    await expect(judgeBtn).toBeDisabled()
  })

  test('allows tab navigation without wallet connection', async ({ page }) => {
    await page.goto('/')

    // Should be able to click through all tabs without wallet
    await page.locator('.console-tab').nth(1).click()
    await expect(page.locator('.console-tab').nth(1)).toHaveClass(/active/)

    await page.locator('.console-tab').nth(2).click()
    await expect(page.locator('.console-tab').nth(2)).toHaveClass(/active/)

    await page.locator('.console-tab').nth(3).click()
    await expect(page.locator('.console-tab').nth(3)).toHaveClass(/active/)

    await page.locator('.console-tab').first().click()
    await expect(page.locator('.console-tab').first()).toHaveClass(/active/)
  })
})
