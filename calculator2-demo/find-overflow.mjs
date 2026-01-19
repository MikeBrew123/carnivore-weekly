import { chromium } from 'playwright'

const calcURL = 'http://localhost:5173'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  console.log('🔍 Finding elements causing horizontal overflow...\n')

  try {
    await page.goto(calcURL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Navigate to results page
    await page.locator('input[name="age"]').fill('35')
    await page.locator('label:has-text("Male")').first().click()
    await page.locator('input[name="heightFeet"]').fill('6')
    await page.locator('input[name="heightInches"]').fill('0')
    await page.locator('input[name="weight"]').fill('200')
    await page.locator('button:has-text("Continue to Next Step")').last().click()
    await page.waitForTimeout(1000)

    await page.locator('select[name="lifestyle"]').selectOption('moderate')
    await page.locator('select[name="exercise"]').selectOption('3-4')
    await page.locator('label:has-text("Fat Loss")').first().click()
    await page.waitForTimeout(500)
    await page.locator('select[name="deficit"]').selectOption('15')
    await page.locator('select[name="diet"]').selectOption('carnivore')
    await page.locator('button:has-text("See Your Results")').last().click()
    await page.waitForTimeout(1500)

    // Find elements wider than viewport
    const wideElements = await page.evaluate(() => {
      const viewportWidth = window.innerWidth
      const scrollWidth = document.documentElement.scrollWidth
      const clientWidth = document.documentElement.clientWidth
      const elements = document.querySelectorAll('*')
      const wide = []

      elements.forEach(el => {
        const rect = el.getBoundingClientRect()
        // Check if element extends beyond the ACTUAL viewport (clientWidth), not innerWidth
        if (rect.left < 0 || rect.right > clientWidth) {
          const computedStyle = window.getComputedStyle(el)
          wide.push({
            tag: el.tagName,
            class: el.className || '(no class)',
            id: el.id || '(no id)',
            width: Math.round(rect.width),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            overflow: Math.round(Math.max(0, rect.right - clientWidth)),
            styles: {
              width: computedStyle.width,
              maxWidth: computedStyle.maxWidth,
              padding: computedStyle.padding,
              margin: computedStyle.margin,
              boxSizing: computedStyle.boxSizing,
            }
          })
        }
      })

      return { viewportWidth, scrollWidth, clientWidth, wide }
    })

    console.log(`window.innerWidth: ${wideElements.viewportWidth}px`)
    console.log(`document.documentElement.scrollWidth: ${wideElements.scrollWidth}px`)
    console.log(`document.documentElement.clientWidth: ${wideElements.clientWidth}px`)
    console.log(`Overflow: ${wideElements.scrollWidth - wideElements.clientWidth}px\n`)
    console.log(`Found ${wideElements.wide.length} elements overflowing viewport:\n`)

    wideElements.wide.forEach((el, i) => {
      console.log(`${i + 1}. <${el.tag}> ${el.class ? `class="${el.class}"` : ''} ${el.id ? `id="${el.id}"` : ''}`)
      console.log(`   Width: ${el.width}px (${el.width - wideElements.viewportWidth}px overflow)`)
      console.log(`   Styles:`, el.styles)
      console.log(`   Content: ${el.innerHTML}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await browser.close()
  }
})()
