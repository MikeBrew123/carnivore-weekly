import { chromium } from 'playwright'

const screenshotDir = '/tmp/calculator-validation-screenshots'

async function checkPadding() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } })

  try {
    console.log('🔍 Navigating to dev server...')
    await page.goto('http://localhost:5173/assets/calculator2/')
    await page.waitForTimeout(2000)

    console.log('📸 Taking desktop screenshot...')
    await page.screenshot({
      path: `${screenshotDir}/padding-final-desktop.png`,
      fullPage: false
    })

    console.log('📱 Switching to mobile view...')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1000)

    console.log('📸 Taking mobile screenshot...')
    await page.screenshot({
      path: `${screenshotDir}/padding-final-mobile.png`,
      fullPage: false
    })

    console.log('✅ Screenshots saved:')
    console.log('   Desktop: /tmp/calculator-validation-screenshots/padding-final-desktop.png')
    console.log('   Mobile: /tmp/calculator-validation-screenshots/padding-final-mobile.png')

    // Keep browser open for 5 seconds so you can see it
    await page.waitForTimeout(5000)
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

checkPadding()
