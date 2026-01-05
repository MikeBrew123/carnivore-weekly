import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()

try {
  // Desktop view
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('http://localhost:8000/public/index.html', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/homepage-desktop.png', fullPage: true })
  console.log('Desktop screenshot saved')

  // Mobile view
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('http://localhost:8000/public/index.html', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/homepage-mobile.png', fullPage: true })
  console.log('Mobile screenshot saved')

} catch (error) {
  console.error('Error:', error.message)
} finally {
  await browser.close()
}
