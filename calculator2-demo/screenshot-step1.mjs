import { chromium } from 'playwright'

const screenshotDir = '/tmp/calculator-validation-screenshots'

async function captureStep1() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } })

  try {
    console.log('📸 Navigating to calculator...')
    await page.goto('http://localhost:5173/assets/calculator2/')
    await page.waitForTimeout(1500)

    console.log('📸 Capturing Step 1 with new padding...')
    await page.screenshot({
      path: `${screenshotDir}/step1-padding-verification.png`,
      fullPage: false
    })

    console.log('✅ Screenshot saved to /tmp/calculator-validation-screenshots/step1-padding-verification.png')
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message)
  } finally {
    await browser.close()
  }
}

captureStep1()
