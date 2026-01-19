import { chromium } from 'playwright'
import fs from 'fs'

const screenshotDir = '/tmp/calculator-mobile-screenshots'
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

const calcURL = 'http://localhost:5173'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14/15 dimensions
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  const page = await context.newPage()

  console.log('📱 Testing calculator at iPhone 14/15 dimensions (390x844)')
  console.log('🔗 URL:', calcURL)

  try {
    await page.goto(calcURL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Step 1 - Physical Stats
    console.log('\n✅ Step 1: Physical Stats')
    await page.screenshot({ path: `${screenshotDir}/step1-mobile.png`, fullPage: true })

    await page.locator('input[name="age"]').fill('35')
    await page.locator('label:has-text("Male")').first().click()
    await page.waitForTimeout(300)

    await page.locator('input[name="heightFeet"]').fill('6')
    await page.locator('input[name="heightInches"]').fill('0')
    await page.locator('input[name="weight"]').fill('200')

    await page.locator('button:has-text("Continue to Next Step")').last().click()
    await page.waitForTimeout(1000)

    // Step 2 - Fitness & Diet
    console.log('✅ Step 2: Fitness & Diet')
    await page.screenshot({ path: `${screenshotDir}/step2-mobile.png`, fullPage: true })

    await page.locator('select[name="lifestyle"]').selectOption('moderate')
    await page.locator('select[name="exercise"]').selectOption('3-4')
    await page.locator('label:has-text("Fat Loss")').first().click()
    await page.waitForTimeout(500)
    await page.locator('select[name="deficit"]').selectOption('15')
    await page.locator('select[name="diet"]').selectOption('carnivore')

    await page.locator('button:has-text("See Your Results")').last().click()
    await page.waitForTimeout(1500)

    // Step 3 - Free Results
    console.log('✅ Step 3: Free Results')
    await page.screenshot({ path: `${screenshotDir}/step3-results-top.png`, fullPage: false })

    // Scroll to check different sections
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/step3-results-middle.png`, fullPage: false })

    await page.evaluate(() => window.scrollTo(0, 800))
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/step3-results-bottom.png`, fullPage: false })

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // Check for horizontal scroll (should be NONE)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

    if (scrollWidth > clientWidth) {
      console.log(`\n❌ HORIZONTAL SCROLL DETECTED: ${scrollWidth}px > ${clientWidth}px`)
    } else {
      console.log(`\n✅ No horizontal scroll: ${clientWidth}px`)
    }

    // Check key elements visibility
    console.log('\n📊 Checking element visibility on mobile...')

    const heading = await page.locator('h2:has-text("Your Personalized")').first().isVisible()
    console.log(`  Heading: ${heading ? '✅' : '❌'}`)

    const profileGrid = await page.locator('span:has-text("Sex:")').first().isVisible()
    console.log(`  Profile grid: ${profileGrid ? '✅' : '❌'}`)

    const macroPreview = await page.locator('h3:has-text("Your Macros Preview")').first().isVisible()
    console.log(`  Macro preview: ${macroPreview ? '✅' : '❌'}`)

    const defaultDay = await page.locator('h3:has-text("Your Sample")').first().isVisible()
    console.log(`  Default Day protocol: ${defaultDay ? '✅' : '❌'}`)

    const ctaButton = await page.locator('button:has-text("Get My Protocol")').first().isVisible()
    console.log(`  CTA button: ${ctaButton ? '✅' : '❌'}`)

    const backButton = await page.locator('button:has-text("Back")').first().isVisible()
    console.log(`  Back button: ${backButton ? '✅' : '❌'}`)

    console.log(`\n✅ Mobile validation complete!`)
    console.log(`📸 Screenshots saved to: ${screenshotDir}`)
    console.log(`\nView screenshots:`)
    console.log(`  open ${screenshotDir}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true })
    throw error
  } finally {
    await browser.close()
  }
})()
