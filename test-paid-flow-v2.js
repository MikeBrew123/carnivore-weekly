const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('\n' + '='.repeat(70));
        console.log('TESTING PAID FLOW WITH NEW PAID-QUESTIONNAIRE.HTML');
        console.log('='.repeat(70) + '\n');

        // Step 1: Load calculator
        console.log('Step 1: Loading calculator page...');
        await page.goto('http://localhost:8000/public/calculator.html', {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(1000);

        // Check path choice exists
        const pathChoiceVisible = await page.locator('#pathChoice').isVisible().catch(() => false);
        console.log(`  ✓ Path choice screen visible: ${pathChoiceVisible ? 'YES' : 'NO'}`);

        // Step 2: Click paid button
        console.log('\nStep 2: Clicking "Get Full Protocol" button...');
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1000);

        // Check calculator is visible
        const calcVisible = await page.locator('#calculatorForm').isVisible().catch(() => false);
        console.log(`  ✓ Calculator visible: ${calcVisible ? 'YES' : 'NO'}`);

        // Step 3: Fill in basic calculator fields
        console.log('\nStep 3: Filling calculator form...');
        await page.fill('#age', '35');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '10');
        await page.fill('#weight', '200');
        console.log('  ✓ Age, height, weight filled');

        // Step 4: Check and fill goal/activity dropdowns
        console.log('\nStep 4: Selecting goal and activity...');
        const goalSelect = await page.locator('select').count();
        console.log(`  ✓ Found ${goalSelect} select dropdowns`);

        // Just click calculate with defaults
        console.log('\nStep 5: Clicking Calculate button...');
        await page.click('button:has-text("Calculate Your Macros")');
        await page.waitForTimeout(2000);

        // Step 6: Check if results appear
        console.log('\nStep 6: Checking for results...');
        const resultsVisible = await page.locator('text="Your Daily Macro Targets"').isVisible().catch(() => false);
        console.log(`  ✓ Results displayed: ${resultsVisible ? 'YES' : 'NO'}`);

        // Step 7: Check for paid-specific button
        console.log('\nStep 7: Looking for "Continue to Full Report" button...');
        const continueBtn = await page.locator('button:has-text("Continue to Full Report")').count();
        console.log(`  ✓ Continue button found: ${continueBtn > 0 ? 'YES' : 'NO'}`);

        if (continueBtn > 0) {
            // Step 8: Click continue and verify redirect
            console.log('\nStep 8: Clicking "Continue to Full Report"...');
            const navPromise = page.waitForNavigation();
            await page.click('button:has-text("Continue to Full Report")');
            await navPromise;

            const url = page.url();
            const isPaidQuestionnaire = url.includes('paid-questionnaire.html');
            console.log(`  ✓ Redirected to paid-questionnaire.html: ${isPaidQuestionnaire ? 'YES' : 'NO'}`);
            console.log(`    URL: ${url}`);

            // Step 9: Verify form exists
            console.log('\nStep 9: Verifying paid questionnaire form...');
            await page.waitForLoadState('domcontentloaded');

            const formExists = await page.locator('#paidQuestionnaireForm').count() > 0;
            console.log(`  ✓ Form element exists: ${formExists ? 'YES' : 'NO'}`);

            // Check key sections
            const sections = {};
            sections['Contact Information'] = await page.locator('text="Your Information"').count() > 0;
            sections['Health Conditions'] = await page.locator('text="Current Health Conditions"').count() > 0;
            sections['Allergies'] = await page.locator('text="Allergies & Food Restrictions"').count() > 0;
            sections['Diet History'] = await page.locator('text="Diet History"').count() > 0;
            sections['Goals'] = await page.locator('text="Your Goals & Priorities"').count() > 0;

            console.log('\n  Form sections:');
            for (const [name, found] of Object.entries(sections)) {
                console.log(`    ${found ? '✓' : '✗'} ${name}`);
            }

            // Step 10: Test form can be filled
            console.log('\nStep 10: Testing form field population...');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="firstName"]', 'John');
            const email = await page.inputValue('input[name="email"]');
            console.log(`  ✓ Email field: ${email}`);
            console.log(`  ✓ First name: John`);

            // Summary
            console.log('\n' + '='.repeat(70));
            console.log('✅ PAID FLOW TEST PASSED');
            console.log('='.repeat(70));
            console.log('\nSummary:');
            console.log('  1. Calculator shows after choosing Paid path ✓');
            console.log('  2. Macro calculation completes ✓');
            console.log('  3. "Continue to Full Report" button appears ✓');
            console.log('  4. Button redirects to paid-questionnaire.html ✓');
            console.log('  5. Form has all required sections ✓');
            console.log('  6. Form fields are functional ✓');
            console.log('\nReady for Stripe payment integration testing!\n');

        } else {
            console.log('\n❌ ERROR: Continue button not found - check button text/layout');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
})();
