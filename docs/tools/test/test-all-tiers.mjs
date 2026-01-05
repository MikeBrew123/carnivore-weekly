import { chromium } from 'playwright';

const TIERS = [
  { id: 'shopping', title: 'Shopping Lists', price: '$19' },
  { id: 'meal_plan', title: '30-Day Meal Plan', price: '$27' },
  { id: 'doctor', title: 'Doctor Script', price: '$47' },
  { id: 'bundle', title: 'Complete Protocol Bundle', price: '$9.99' },
];

async function testAllTiers() {
  const browser = await chromium.launch({ headless: true });

  console.log('\n🎯 ALL TIERS CHECKOUT TEST\n');
  console.log('═══════════════════════════════════════════════════════════════');

  const results = [];

  for (const tier of TIERS) {
    console.log(`\n📍 Testing ${tier.title} (${ tier.price})...`);

    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    try {
      // Open calculator
      await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Get Your Macros")');
      await page.waitForTimeout(2000);

      // Fill Step 1
      await page.click('input[type="radio"][value="male"]');
      const inputs = await page.locator('input[type="number"]').all();
      await inputs[0].fill('42');
      await inputs[1].fill('5');
      await inputs[2].fill('11');
      await inputs[3].fill('215');

      // Go to Step 2
      await page.click('button:has-text("Continue to Next Step")');
      await page.waitForTimeout(2000);

      // Fill Step 2
      const selects = await page.locator('select').all();
      if (selects.length > 0) await selects[0].selectOption({ index: 1 });
      if (selects.length > 1) await selects[1].selectOption({ index: 1 });
      if (selects.length > 2) await selects[2].selectOption({ index: 1 });
      if (selects.length > 3) await selects[3].selectOption({ index: 1 });

      // Go to Step 3
      await page.click('button:has-text("See Your Results")');
      await page.waitForTimeout(2500);

      // Open pricing modal
      await page.click('button:has-text("Upgrade for Full Personalized Protocol")');
      await page.waitForTimeout(2000);

      // Check if tier title and price are visible
      const tierTitleVisible = await page.locator(`text=${tier.title}`).isVisible({ timeout: 1000 }).catch(() => false);
      const tierPriceVisible = await page.locator(`text=${tier.price}`).isVisible({ timeout: 1000 }).catch(() => false);

      if (tierTitleVisible && tierPriceVisible) {
        console.log(`   ✅ ${tier.title} card visible in pricing modal`);
        results.push({ tier: tier.id, status: 'FOUND_IN_MODAL' });
      } else {
        console.log(`   ⚠️  Could not find ${tier.title} card in modal`);
        results.push({ tier: tier.id, status: 'MISSING_FROM_MODAL' });
      }

      // Find and click the tier's "Choose Plan" button
      // Since multiple cards have "Choose Plan", we need to find the right one
      const cards = await page.locator('.pricing-card-container').all();
      let tierCardFound = false;

      for (let i = 0; i < cards.length; i++) {
        const cardText = await cards[i].textContent();
        if (cardText && cardText.includes(tier.title)) {
          console.log(`   ✅ Located tier card (${i + 1} of ${cards.length})`);

          // Get the button within this card
          const button = cards[i].locator('button:has-text("Choose Plan")');
          if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`   ✅ "Choose Plan" button visible for ${tier.title}`);
            tierCardFound = true;
            results.push({ tier: tier.id, status: 'BUTTON_READY' });
          } else {
            console.log(`   ⚠️  "Choose Plan" button not visible`);
            results.push({ tier: tier.id, status: 'BUTTON_NOT_VISIBLE' });
          }
          break;
        }
      }

      if (!tierCardFound) {
        console.log(`   ⚠️  Could not find card for ${tier.title}`);
      }

    } catch (error) {
      console.error(`   ❌ Error testing ${tier.title}:`, error.message);
      results.push({ tier: tier.id, status: 'ERROR', error: error.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Print summary
  console.log('\n' + '═══════════════════════════════════════════════════════════════');
  console.log('✅ TIER AVAILABILITY SUMMARY\n');

  results.forEach(result => {
    const tierInfo = TIERS.find(t => t.id === result.tier);
    console.log(`${tierInfo?.title} ($${tierInfo?.price}):`);
    console.log(`  Status: ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error}`);
  });

  const allFound = results.every(r => r.status === 'BUTTON_READY');
  console.log(`\n${allFound ? '✅ ALL TIERS READY FOR CHECKOUT' : '⚠️  SOME TIERS NEED ATTENTION'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(allFound ? 0 : 1);
}

testAllTiers();
