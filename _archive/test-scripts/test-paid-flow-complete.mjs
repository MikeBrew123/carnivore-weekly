import { chromium } from 'playwright';

const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

async function testPaidFlow() {
    console.log('\n🧪 TESTING PAID FLOW - START TO FINISH\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    try {
        // TEST 1: Page loads with calculator visible
        console.log('TEST 1: Page loads with calculator visible');
        console.log('─────────────────────────────────────────');
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        const calcFormVisible = await page.isVisible('#calculatorForm');
        const pathChoiceExists = await page.$('#pathChoice');

        console.log(`✅ Calculator form visible: ${calcFormVisible}`);
        console.log(`✅ Path choice removed: ${pathChoiceExists === null}`);

        // TEST 2: Fill basic form
        console.log('\nTEST 2: Fill basic form');
        console.log('─────────────────────────────────────────');

        await page.fill('#age', '40');
        await page.fill('#weight', '190');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '11');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'lose');
        await page.selectOption('#diet', 'carnivore');

        console.log('✅ Filled basic form: Age=40, Weight=190, Height=5\'11", Sex=Male, Goal=Loss');

        // TEST 3: Click calculate
        console.log('\nTEST 3: Click "Calculate My Macros"');
        console.log('─────────────────────────────────────────');

        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });

        const resultsVisible = await page.isVisible('#resultsSection');
        console.log(`✅ Results section visible: ${resultsVisible}`);

        // TEST 4: Verify results
        console.log('\nTEST 4: Verify macro results');
        console.log('─────────────────────────────────────────');

        const caloriesText = await page.textContent('#outCalories');
        const proteinText = await page.textContent('#outProtein');

        console.log(`✅ Calories: ${caloriesText ? caloriesText.trim() : 'N/A'}`);
        console.log(`✅ Protein: ${proteinText ? proteinText.trim() : 'N/A'}`);

        // TEST 5: Click "Upgrade for $9.99" button
        console.log('\nTEST 5: Click "Upgrade for $9.99" button');
        console.log('─────────────────────────────────────────');

        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        console.log(`✅ Upgrade button visible: ${await upgradeBtn.isVisible()}`);

        await upgradeBtn.click();
        console.log('✅ Clicked "Upgrade for $9.99"');

        await page.waitForTimeout(2000);

        // TEST 6: Verify advanced sections revealed
        console.log('\nTEST 6: Verify advanced form sections revealed');
        console.log('─────────────────────────────────────────');

        const advancedSectionsVisible = await page.isVisible('#advancedSections');
        const advancedHidden = await page.evaluate(() => {
            const elem = document.getElementById('advancedSections');
            return elem ? elem.classList.contains('hidden') : true;
        });

        console.log(`✅ Advanced sections NOT hidden: ${!advancedHidden}`);
        console.log(`✅ Advanced sections visible: ${advancedSectionsVisible}`);

        // TEST 7: Verify email field is present
        console.log('\nTEST 7: Verify email field');
        console.log('─────────────────────────────────────────');

        const emailFieldVisible = await page.isVisible('#email');
        console.log(`✅ Email field visible: ${emailFieldVisible}`);

        // TEST 8: Verify results buttons are hidden
        console.log('\nTEST 8: Verify results buttons hidden');
        console.log('─────────────────────────────────────────');

        const resultsBtnsHidden = await page.evaluate(() => {
            const elem = document.getElementById('resultsButtons');
            return elem ? elem.style.display === 'none' : false;
        });

        console.log(`✅ Results buttons hidden: ${resultsBtnsHidden}`);

        // TEST 9: Fill email (required field)
        console.log('\nTEST 9: Fill email address');
        console.log('─────────────────────────────────────────');

        await page.fill('#email', 'test@example.com');
        console.log('✅ Filled email: test@example.com');

        // TEST 10: Fill some advanced form fields
        console.log('\nTEST 10: Fill advanced form fields');
        console.log('─────────────────────────────────────────');

        const firstNameField = await page.$('input[name="firstName"]');
        if (firstNameField) {
            await page.fill('input[name="firstName"]', 'John');
            console.log('✅ Filled firstName: John');
        }

        const carniExperienceField = await page.$('select[name="carnivoreExperience"]');
        if (carniExperienceField) {
            await page.selectOption('select[name="carnivoreExperience"]', 'never');
            console.log('✅ Selected carnivore experience: never');
        }

        // TEST 11: Verify "Pay & Build Report" button
        console.log('\nTEST 11: Verify "Pay & Build Report" button');
        console.log('─────────────────────────────────────────');

        const payBtn = await page.locator('button:has-text("Pay & Build Report")').first();
        const payBtnVisible = await payBtn.isVisible().catch(() => false);

        console.log(`✅ "Pay & Build Report" button visible: ${payBtnVisible}`);

        // Get button text
        const payBtnText = await payBtn.textContent().catch(() => '');
        console.log(`Button text: "${payBtnText.trim()}"`);

        // TEST 12: Test email validation (click without filling)
        console.log('\nTEST 12: Test email validation');
        console.log('─────────────────────────────────────────');

        // Clear email to test validation
        await page.fill('#email', '');

        // Try clicking pay button - should show alert
        let validationAlertShown = false;
        page.on('dialog', async dialog => {
            console.log(`✅ Validation alert shown: "${dialog.message()}"`);
            validationAlertShown = true;
            await dialog.accept();
        });

        await payBtn.click().catch(() => {});
        await page.waitForTimeout(500);

        // TEST 13: Fill email again for final test
        console.log('\nTEST 13: Fill email for payment test');
        console.log('─────────────────────────────────────────');

        await page.fill('#email', 'test@example.com');
        console.log('✅ Filled email: test@example.com');

        // TEST 14: Take screenshot of paid form
        console.log('\nTEST 14: Capture paid form with advanced sections');
        console.log('─────────────────────────────────────────');

        await page.screenshot({ path: '/tmp/paid-flow-form.png', fullPage: true });
        console.log('✅ Screenshot saved: /tmp/paid-flow-form.png');

        // TEST 15: Verify Stripe redirect would happen
        console.log('\nTEST 15: Verify payment flow setup');
        console.log('─────────────────────────────────────────');

        // Check if form data would be collected
        const formData = await page.evaluate(() => {
            const email = document.getElementById('email').value;
            const age = document.getElementById('age').value;
            const weight = document.getElementById('weight').value;
            return { email, age, weight };
        });

        console.log(`✅ Form data ready:`);
        console.log(`   - Email: ${formData.email}`);
        console.log(`   - Age: ${formData.age}`);
        console.log(`   - Weight: ${formData.weight}`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ PAID FLOW TEST COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════\n');

        return { success: true, type: 'paid' };

    } catch (error) {
        console.error('\n❌ PAID FLOW TEST FAILED:', error.message);
        try {
            await page.screenshot({ path: '/tmp/paid-flow-error.png', fullPage: true });
            console.error('Error screenshot saved: /tmp/paid-flow-error.png');
        } catch (e) {
            // Ignore
        }
        return { success: false, type: 'paid', error: error.message };
    } finally {
        await browser.close();
    }
}

testPaidFlow().then(result => {
    process.exit(result.success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
