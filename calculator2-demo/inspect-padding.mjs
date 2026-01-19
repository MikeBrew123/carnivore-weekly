import { chromium } from 'playwright'

const screenshotDir = '/tmp/calculator-validation-screenshots'

async function inspectPadding() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } })

  try {
    console.log('🔍 Navigating to dev server...')
    await page.goto('http://localhost:5174/assets/calculator2/')
    await page.waitForTimeout(2000)

    // Find the black form container
    const formContainer = await page.locator('div').filter({ hasText: 'Let\'s Start with Your Basics' }).first()
    const containerWithPadding = await page.locator('[class*="px-"]').filter({ hasText: 'Let\'s Start with Your Basics' }).first()

    console.log('\n🔍 Inspecting form container...')

    // Get computed styles
    const styles = await containerWithPadding.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        className: el.className,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom,
        backgroundColor: computed.backgroundColor,
        width: computed.width,
      }
    })

    console.log('Computed styles:', JSON.stringify(styles, null, 2))

    // Take annotated screenshot
    await page.screenshot({
      path: `${screenshotDir}/padding-inspect.png`,
      fullPage: false
    })

    console.log('\n✅ Screenshot saved to: /tmp/calculator-validation-screenshots/padding-inspect.png')

    await page.waitForTimeout(3000)
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

inspectPadding()
