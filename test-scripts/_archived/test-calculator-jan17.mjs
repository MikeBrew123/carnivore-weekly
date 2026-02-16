import { chromium } from 'playwright';

const testData = {
  email: 'test-jan17@carnivoreweekly.com',
  coupon: 'TEST999',
  first_name: 'Test',
  last_name: 'User',
  foods_to_avoid: 'liver, sardines'
};

async function fillCalculator() {
  console.log('🚀 Starting calculator test with headless: false');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    // Navigate to calculator
    console.log('📍 Navigating to calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for React to render
    console.log('⏳ Waiting for React app to load...');
    await page.waitForTimeout(3000);

    // ===== STEP 1: Demographics =====
    console.log('📝 Step 1: Filling demographics...');

    // Find and click Male button (likely a styled button/div, not input)
    const maleBtn = await page.locator('text=Male').first();
    if (await maleBtn.isVisible()) {
      await maleBtn.click();
      console.log('  ✓ Selected Male');
    } else {
      // Try alternative selectors
      await page.locator('[data-value="male"], button:has-text("Male"), label:has-text("Male")').first().click();
    }
    await page.waitForTimeout(500);

    // Age - find input near "Age" label
    const ageInput = await page.locator('input[type="number"]').first();
    await ageInput.fill('44');
    console.log('  ✓ Age: 44');
    await page.waitForTimeout(300);

    // Weight
    const weightInput = await page.locator('input[type="number"]').nth(1);
    await weightInput.fill('222');
    console.log('  ✓ Weight: 222 lbs');
    await page.waitForTimeout(300);

    // Height - find select dropdowns
    const selects = await page.locator('select').all();
    if (selects.length >= 2) {
      await selects[0].selectOption('6');
      console.log('  ✓ Height feet: 6');
      await page.waitForTimeout(200);
      await selects[1].selectOption('0');
      console.log('  ✓ Height inches: 0');
    }
    await page.waitForTimeout(500);

    // Screenshot Step 1
    await page.screenshot({ path: '/tmp/calc-step1.png' });
    console.log('📸 Screenshot: /tmp/calc-step1.png');

    // Click Continue
    console.log('➡️ Looking for Continue button...');
    const continueBtn = await page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    await continueBtn.click();
    console.log('  ✓ Clicked Continue');
    await page.waitForTimeout(2000);

    // ===== STEP 2: Activity =====
    console.log('📝 Step 2: Activity level...');

    // Look for Moderate option
    const moderateBtn = await page.locator('text=Moderate').first();
    if (await moderateBtn.isVisible()) {
      await moderateBtn.click();
      console.log('  ✓ Selected Moderate');
    }
    await page.waitForTimeout(500);

    // Exercise frequency - look for 3-4 days
    const freq34 = await page.locator('text=/3.*4|3-4/').first();
    if (await freq34.isVisible()) {
      await freq34.click();
      console.log('  ✓ Selected 3-4 days/week');
    }
    await page.waitForTimeout(500);

    // Screenshot Step 2
    await page.screenshot({ path: '/tmp/calc-step2.png' });

    // Continue
    const continueBtn2 = await page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    await continueBtn2.click();
    console.log('➡️ Continuing to Step 3...');
    await page.waitForTimeout(2000);

    // ===== STEP 3: Goals =====
    console.log('📝 Step 3: Goals...');

    // Weight loss
    const weightLossBtn = await page.locator('text=/[Ww]eight.*[Ll]oss|[Ll]ose.*[Ww]eight/').first();
    if (await weightLossBtn.isVisible()) {
      await weightLossBtn.click();
      console.log('  ✓ Selected Weight Loss');
    }
    await page.waitForTimeout(500);

    // Deficit - look for 15%
    const deficit15 = await page.locator('text=/15%|15 ?percent/').first();
    if (await deficit15.isVisible()) {
      await deficit15.click();
      console.log('  ✓ Selected 15% deficit');
    } else {
      // Try select dropdown
      const deficitSelect = await page.locator('select').first();
      if (await deficitSelect.isVisible()) {
        await deficitSelect.selectOption({ label: /15/ });
      }
    }
    await page.waitForTimeout(500);

    // Diet type - KETO (key test!)
    console.log('🔍 Setting diet type to KETO...');
    const ketoBtn = await page.locator('text=Keto').first();
    if (await ketoBtn.isVisible()) {
      await ketoBtn.click();
      console.log('  ✓ Selected KETO diet');
    }
    await page.waitForTimeout(500);

    // Screenshot Step 3
    await page.screenshot({ path: '/tmp/calc-step3.png' });

    // Click to see results
    const resultsBtn = await page.locator('button:has-text("See"), button:has-text("Results"), button:has-text("Continue")').first();
    await resultsBtn.click();
    console.log('➡️ Continuing to results/checkout...');
    await page.waitForTimeout(3000);

    // ===== CHECKOUT =====
    console.log('💳 Checkout...');

    // Screenshot current state
    await page.screenshot({ path: '/tmp/calc-checkout.png' });

    // Look for email input
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(testData.email);
      console.log('  ✓ Email:', testData.email);
    }
    await page.waitForTimeout(500);

    // Coupon
    const couponInput = await page.locator('input[placeholder*="coupon" i], input[placeholder*="code" i]').first();
    if (await couponInput.isVisible()) {
      await couponInput.fill(testData.coupon);
      console.log('  ✓ Coupon:', testData.coupon);

      // Apply
      const applyBtn = await page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        console.log('  ✓ Applied coupon');
        await page.waitForTimeout(1500);
      }
    }

    // Select tier - look for any select/choose button
    const tierBtn = await page.locator('button:has-text("Select"), button:has-text("Choose"), button:has-text("Get"), button:has-text("Unlock")').first();
    if (await tierBtn.isVisible()) {
      await tierBtn.click();
      console.log('  ✓ Selected tier');
      await page.waitForTimeout(3000);
    }

    // Screenshot after tier selection
    await page.screenshot({ path: '/tmp/calc-tier-selected.png' });

    // Check for Stripe redirect
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    if (currentUrl.includes('stripe') || currentUrl.includes('checkout.stripe')) {
      console.log('💳 On Stripe checkout - filling test card...');

      // Stripe hosted checkout page fields
      await page.waitForTimeout(2000);

      // Email (if not pre-filled)
      const stripeEmail = await page.locator('input#email').first();
      if (await stripeEmail.isVisible()) {
        await stripeEmail.fill(testData.email);
      }

      // Card number
      const cardNumber = await page.locator('input#cardNumber').first();
      if (await cardNumber.isVisible()) {
        await cardNumber.fill('4242424242424242');
        console.log('  ✓ Card: 4242...');
      }

      // Expiry
      const cardExpiry = await page.locator('input#cardExpiry').first();
      if (await cardExpiry.isVisible()) {
        await cardExpiry.fill('1228');
        console.log('  ✓ Expiry: 12/28');
      }

      // CVC
      const cardCvc = await page.locator('input#cardCvc').first();
      if (await cardCvc.isVisible()) {
        await cardCvc.fill('123');
        console.log('  ✓ CVC: 123');
      }

      // Billing name
      const billingName = await page.locator('input#billingName').first();
      if (await billingName.isVisible()) {
        await billingName.fill('Test User');
        console.log('  ✓ Name: Test User');
      }

      // Screenshot before pay
      await page.screenshot({ path: '/tmp/calc-stripe-filled.png' });

      // Submit payment
      const payBtn = await page.locator('button[type="submit"], button:has-text("Pay")').first();
      if (await payBtn.isVisible()) {
        console.log('💰 Clicking Pay button...');
        await payBtn.click();
        console.log('⏳ Waiting for payment processing...');
        await page.waitForTimeout(10000);
      }
    }

    // ===== STEP 4: Health Profile (after payment) =====
    console.log('📝 Step 4: Health Profile...');
    await page.waitForTimeout(2000);

    // Screenshot current state
    await page.screenshot({ path: '/tmp/calc-step4.png' });
    console.log('📸 Screenshot: /tmp/calc-step4.png');

    // First name
    const firstNameInput = await page.locator('input[placeholder*="first" i], input[name*="first" i]').first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill(testData.first_name);
      console.log('  ✓ First name:', testData.first_name);
    }

    // Last name
    const lastNameInput = await page.locator('input[placeholder*="last" i], input[name*="last" i]').first();
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill(testData.last_name);
      console.log('  ✓ Last name:', testData.last_name);
    }

    // Allergies - eggs, shellfish
    console.log('🥚 Setting allergies...');
    const eggsCheckbox = await page.locator('text=Eggs, text=eggs, label:has-text("Eggs")').first();
    if (await eggsCheckbox.isVisible()) {
      await eggsCheckbox.click();
      console.log('  ✓ Allergy: eggs');
    }

    const shellfishCheckbox = await page.locator('text=Shellfish, label:has-text("Shellfish")').first();
    if (await shellfishCheckbox.isVisible()) {
      await shellfishCheckbox.click();
      console.log('  ✓ Allergy: shellfish');
    }
    await page.waitForTimeout(500);

    // Foods to avoid
    const avoidInput = await page.locator('textarea, input[placeholder*="avoid" i]').first();
    if (await avoidInput.isVisible()) {
      await avoidInput.fill(testData.foods_to_avoid);
      console.log('  ✓ Foods to avoid:', testData.foods_to_avoid);
    }

    // Health conditions - click 2-3
    console.log('🏥 Setting health conditions...');
    const conditions = ['Joint', 'Fatigue', 'Brain fog', 'Inflammation'];
    for (const condition of conditions.slice(0, 3)) {
      const conditionEl = await page.locator(`text=${condition}`).first();
      if (await conditionEl.isVisible()) {
        await conditionEl.click();
        console.log(`  ✓ Condition: ${condition}`);
        await page.waitForTimeout(300);
      }
    }

    // Screenshot Step 4 filled
    await page.screenshot({ path: '/tmp/calc-step4-filled.png' });

    // ===== GENERATE REPORT =====
    console.log('🎯 Looking for Generate button...');

    const generateBtn = await page.locator('button:has-text("Generate"), button:has-text("Create"), button:has-text("Protocol"), button:has-text("Get My")').first();

    if (await generateBtn.isVisible()) {
      console.log('✅ Found Generate button, clicking...');
      await generateBtn.click();

      console.log('⏳ Waiting for report generation (this takes 30-60 seconds)...');
      await page.waitForTimeout(60000);

      // Screenshot final result
      await page.screenshot({ path: '/tmp/calc-report.png' });
      console.log('📸 Screenshot: /tmp/calc-report.png');
    } else {
      console.log('⚠️ Could not find Generate button automatically');
    }

    // Final status
    console.log('\n========================================');
    console.log('🔍 BROWSER LEFT OPEN FOR INSPECTION');
    console.log('📍 Current URL:', page.url());
    console.log('========================================');
    console.log('\n📸 Screenshots saved to /tmp/calc-*.png');
    console.log('🖱️ Complete any remaining steps manually');
    console.log('\nPress Ctrl+C to close when done.\n');

    // Keep browser open indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);

    // Screenshot on error
    await page.screenshot({ path: '/tmp/calc-error.png' });
    console.log('📸 Error screenshot: /tmp/calc-error.png');

    console.log('\n🖱️ Browser left open for manual completion');
    console.log('📍 Current URL:', page.url());

    // Keep browser open
    await new Promise(() => {});
  }
}

fillCalculator();
