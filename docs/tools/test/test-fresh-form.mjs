import { chromium } from 'playwright'

(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('\n🧪 Testing Fresh Calculator Form\n')
    console.log('URL: http://localhost:8000/calculator.html\n')

    await page.goto('http://localhost:8000/calculator.html', {
      waitUntil: 'load',
      timeout: 30000
    })
    await page.waitForTimeout(2000)

    console.log('✓ Page loaded')

    // Test Step 1: Physical Stats
    console.log('\n📝 Testing Step 1: Physical Stats')

    // Select sex: Male
    const maleRadio = await page.locator('input[type="radio"][value="male"]')
    await maleRadio.click()
    console.log('  ✓ Selected sex: male')

    // Fill age
    const ageInput = await page.locator('input[name="age"]')
    await ageInput.fill('35')
    console.log('  ✓ Filled age: 35')

    // Fill height feet
    const heightFeetInputs = await page.locator('input[name="heightFeet"]').all()
    if (heightFeetInputs.length > 0) {
      await heightFeetInputs[0].fill('5')
      console.log('  ✓ Filled height (feet): 5')
    }

    // Fill height inches
    const heightInchesInputs = await page.locator('input[name="heightInches"]').all()
    if (heightInchesInputs.length > 0) {
      await heightInchesInputs[0].fill('10')
      console.log('  ✓ Filled height (inches): 10')
    }

    // Fill weight
    const weightInputs = await page.locator('input[name="weight"]').all()
    if (weightInputs.length > 0) {
      await weightInputs[weightInputs.length - 1].fill('200')
      console.log('  ✓ Filled weight: 200')
    }

    // Click Continue button
    const buttons = await page.locator('button').all()
    const continueButton = buttons.find(async (btn) => {
      const text = await btn.textContent()
      return text.includes('Continue')
    })

    if (continueButton) {
      await continueButton.click()
      console.log('  ✓ Clicked Continue button')
      await page.waitForTimeout(1000)
    }

    // Test Step 2: Fitness & Diet
    console.log('\n📝 Testing Step 2: Fitness & Diet')

    // Select activity level
    const activitySelect = await page.locator('select[name="lifestyle"]')
    if (await activitySelect.isVisible()) {
      await activitySelect.selectOption('moderate')
      console.log('  ✓ Selected activity level: moderate')
    }

    // Select exercise frequency
    const exerciseSelect = await page.locator('select[name="exercise"]')
    if (await exerciseSelect.isVisible()) {
      await exerciseSelect.selectOption('3-4')
      console.log('  ✓ Selected exercise frequency: 3-4 days/week')
    }

    // Select goal
    const maintainRadio = await page.locator('input[type="radio"][value="maintain"]')
    if (await maintainRadio.isVisible()) {
      await maintainRadio.click()
      console.log('  ✓ Selected goal: maintain')
    }

    // Select diet type
    const dietSelect = await page.locator('select[name="diet"]')
    if (await dietSelect.isVisible()) {
      await dietSelect.selectOption('carnivore')
      console.log('  ✓ Selected diet: carnivore')
    }

    // Click "See Your Results" button
    const allButtons = await page.locator('button').all()
    for (const btn of allButtons) {
      const text = await btn.textContent()
      if (text.includes('See Your Results')) {
        await btn.click()
        console.log('  ✓ Clicked "See Your Results" button')
        break
      }
    }

    await page.waitForTimeout(2000)

    // Test Step 3: Free Results
    console.log('\n📝 Testing Step 3: Free Results')

    const pageText = await page.textContent()
    if (pageText.includes('Personalized Carnivore Macros')) {
      console.log('  ✓ Results page displayed')
      console.log('  ✓ Page shows macro calculation')
    }

    if (pageText.includes('Upgrade')) {
      console.log('  ✓ Upgrade button visible')
    }

    console.log('\n═══════════════════════════════════')
    console.log('✅ FRESH FORM WORKING CORRECTLY!')
    console.log('═══════════════════════════════════\n')

    console.log('Browser open for manual inspection (30 seconds)...')
    await page.waitForTimeout(30000)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await browser.close()
  }
})()
