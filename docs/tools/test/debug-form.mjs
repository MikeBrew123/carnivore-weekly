import { chromium } from 'playwright'

(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    console.log('Loading http://localhost:8000/calculator.html...\n')

    await page.goto('http://localhost:8000/calculator.html', {
      waitUntil: 'load',
      timeout: 30000
    })

    // Wait a bit longer for React to mount
    await page.waitForTimeout(3000)

    // Get page content
    const content = await page.content()
    const title = await page.title()

    console.log('Page Title:', title)
    console.log('\nChecking for React App...')

    // Check if root div exists
    const rootDiv = await page.locator('#root')
    const rootExists = await rootDiv.isVisible().catch(() => false)
    console.log('✓ Root div exists:', rootExists)

    // Check for form elements
    const formText = await page.locator('text=/Let\'s Start with Your Basics/').isVisible().catch(() => false)
    console.log('✓ Form heading visible:', formText)

    // List all input types on page
    const inputs = await page.locator('input').count()
    console.log(`✓ Found ${inputs} input elements`)

    // Get page body text (first 500 chars)
    const bodyText = await page.textContent('body')
    console.log('\n📄 Page Content (first 1000 chars):')
    console.log(bodyText.substring(0, 1000))

    // Look for error messages in console
    page.on('console', (msg) => console.log('Console:', msg.text()))
    page.on('pageerror', (err) => console.log('Error:', err))

    await browser.close()

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    await browser.close()
  }
})()
