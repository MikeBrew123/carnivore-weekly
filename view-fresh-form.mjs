import { chromium } from 'playwright'

(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  try {
    console.log('Opening fresh calculator form...\n')
    await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'load' })
    await page.waitForTimeout(1000)

    console.log('✓ Fresh form is now visible in your browser')
    console.log('✓ Staying open for 5 minutes for you to explore\n')

    // Keep browser open
    await page.waitForTimeout(300000)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await browser.close()
  }
})()
