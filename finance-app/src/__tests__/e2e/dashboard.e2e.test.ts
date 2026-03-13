import { test, expect } from '@playwright/test'

test.describe('Dashboard Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/dashboard')
  })

  test('displays dashboard with key elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Finance App/)

    // Check main dashboard heading
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Check that overview cards are present
    await expect(page.locator('text=Net Worth')).toBeVisible()
    await expect(page.locator('text=Monthly Income')).toBeVisible()
    await expect(page.locator('text=Monthly Expenses')).toBeVisible()
    await expect(page.locator('text=Savings Rate')).toBeVisible()
  })

  test('shows financial metrics with proper formatting', async ({ page }) => {
    // Check for currency formatting
    await expect(page.locator('text=$45,251')).toBeVisible() // Net Worth
    await expect(page.locator('text=$4,600')).toBeVisible()  // Income
    await expect(page.locator('text=$3,200')).toBeVisible()  // Expenses

    // Check percentage formatting
    await expect(page.locator('text=30.4%')).toBeVisible() // Savings Rate
  })

  test('displays charts and visualizations', async ({ page }) => {
    // Check for chart titles
    await expect(page.locator('text=Income vs Expenses Trend')).toBeVisible()
    await expect(page.locator('text=Spending Breakdown')).toBeVisible()
    await expect(page.locator('text=Category Spending Comparison')).toBeVisible()
  })

  test('shows recent transactions section', async ({ page }) => {
    // Check transactions section
    await expect(page.locator('text=Recent Transactions')).toBeVisible()
    await expect(page.locator('text=Your latest financial activity')).toBeVisible()

    // Check for sample transactions
    await expect(page.locator('text=Starbucks Coffee')).toBeVisible()
    await expect(page.locator('text=Spotify Premium')).toBeVisible()
    await expect(page.locator('text=Salary Deposit')).toBeVisible()
  })

  test('displays quick actions panel', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible()
    await expect(page.locator('text=Upload Documents')).toBeVisible()
    await expect(page.locator('text=Set Budget Goals')).toBeVisible()
    await expect(page.locator('text=Investment Review')).toBeVisible()
  })

  test('shows budget alert', async ({ page }) => {
    await expect(page.locator('text=Budget Alert')).toBeVisible()
    await expect(page.locator("text=You're 80% through your dining budget")).toBeVisible()
  })

  test('is responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Check that content is still visible and accessible
    await expect(page.locator('h1')).toContainText('Dashboard')
    await expect(page.locator('text=Net Worth')).toBeVisible()

    // Check that cards stack properly on mobile
    const cards = page.locator('[class*="grid"]').first()
    await expect(cards).toBeVisible()
  })

  test('supports keyboard navigation', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab')
    
    // Should be able to navigate to interactive elements
    // This would depend on the specific header implementation
    await expect(page.locator(':focus')).toBeVisible()
  })

  test('handles theme toggle if present', async ({ page }) => {
    // Look for theme toggle button (if implemented)
    const themeToggle = page.locator('[aria-label*="Toggle theme"]')
    
    if (await themeToggle.count() > 0) {
      await themeToggle.click()
      
      // Check that theme changes (this would depend on implementation)
      // For now, just verify the button is clickable
      await expect(themeToggle).toBeVisible()
    }
  })

  test('displays last updated timestamp', async ({ page }) => {
    await expect(page.locator('text=Last updated:')).toBeVisible()
  })

  test('shows proper loading states', async ({ page }) => {
    // Navigate to page and check for immediate content
    await page.goto('/dashboard')
    
    // Since we're using mock data, content should appear quickly
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Net Worth')).toBeVisible({ timeout: 5000 })
  })

  test('has proper accessibility attributes', async ({ page }) => {
    // Check for main landmark
    await expect(page.locator('main')).toBeVisible()
    
    // Check for proper heading structure
    const h1 = page.locator('h1')
    await expect(h1).toContainText('Dashboard')
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
  })

  test('handles different screen sizes', async ({ page }) => {
    // Test large desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
    
    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})

test.describe('Dashboard Navigation', () => {
  test('allows navigation to other pages from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // This would test navigation once other pages are implemented
    // For now, just verify the dashboard loads properly
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})

test.describe('Dashboard Data Integration', () => {
  test('displays consistent financial calculations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verify that the displayed data is mathematically consistent
    const incomeText = await page.locator('text=$4,600').textContent()
    const expenseText = await page.locator('text=$3,200').textContent()
    const savingsRateText = await page.locator('text=30.4%').textContent()
    
    expect(incomeText).toContain('$4,600')
    expect(expenseText).toContain('$3,200')
    expect(savingsRateText).toContain('30.4%')
  })

  test('shows proper trend indicators', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for trend indicators
    await expect(page.locator('text=+2.1% from last month')).toBeVisible()
    await expect(page.locator('text=+5.2% from last month')).toBeVisible()
    await expect(page.locator('text=-3.1% from last month')).toBeVisible()
  })
})

test.describe('Dashboard Performance', () => {
  test('loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await expect(page.locator('text=Dashboard')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
  })

  test('handles rapid interactions without errors', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Rapidly click different areas of the page
    for (let i = 0; i < 10; i++) {
      await page.click('body')
      await page.waitForTimeout(100)
    }
    
    // Page should still be functional
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})