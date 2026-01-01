const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('\n' + '='.repeat(70));
        console.log('TESTING COMPLETE PAID FLOW');
        console.log('='.repeat(70) + '\n');

        // Step 1: Load calculator and select paid path
        console.log('Step 1: Loading calculator page...');
        await page.goto('http://localhost:8000/public/calculator.html', {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(500);

        // Verify path choice screen exists
        const pathChoice = await page.locator('#pathChoice').count();
        console.log(`  ✓ Path choice screen visible: ${pathChoice > 0 ? 'YES' : 'NO'}`);

        // Step 2: Click paid path button
        console.log('\nStep 2: Clicking "Get Full Protocol ($9.99)" button...');
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1000);

        // Verify calculator is now visible
        const calcVisible = await page.locator('#calculatorForm:not([style*="display:none"])').count();
        console.log(`  ✓ Calculator visible after choosing paid: ${calcVisible > 0 ? 'YES' : 'NO'}`);

        // Step 3: Fill in calculator form
        console.log('\nStep 3: Filling calculator form...');
        await page.fill('#age', '35');
        await page.fill('#weight', '200');
        await page.fill('#height', '70');
        await page.selectOption('#goal', 'fat_loss');
        await page.selectOption('#activityLevel', 'moderate');
        console.log('  ✓ Form fields filled');

        // Step 4: Calculate macros
        console.log('\nStep 4: Calculating macros...');
        await page.click('button:has-text("Calculate")');
        await page.waitForTimeout(2000);

        // Check if results are displayed
        const resultsVisible = await page.locator('#results:not([style*="display:none"])').count();
        console.log(`  ✓ Results displayed: ${resultsVisible > 0 ? 'YES' : 'NO'}`);

        // Step 5: Check for "Continue to Full Report" button
        console.log('\nStep 5: Looking for "Continue to Full Report" button...');
        const continueBtn = await page.locator('text="Continue to Full Report"').count();
        console.log(`  ✓ Continue button visible: ${continueBtn > 0 ? 'YES' : 'NO'}`);

        if (continueBtn > 0) {
            // Step 6: Click continue button and check redirect
            console.log('\nStep 6: Clicking "Continue to Full Report" button...');
            await Promise.all([
                page.waitForNavigation(),
                page.click('text="Continue to Full Report"')
            ]);

            // Check if on paid-questionnaire page
            const currentURL = page.url();
            const isPaidQuestionnaire = currentURL.includes('paid-questionnaire.html');
            console.log(`  ✓ Redirected to paid-questionnaire.html: ${isPaidQuestionnaire ? 'YES' : 'NO'}`);
            console.log(`    Current URL: ${currentURL}`);

            // Step 7: Verify form structure
            console.log('\nStep 7: Verifying paid questionnaire form...');
            await page.waitForTimeout(500);

            const formExists = await page.locator('#paidQuestionnaireForm').count();
            console.log(`  ✓ Paid questionnaire form exists: ${formExists > 0 ? 'YES' : 'NO'}`);

            // Check for key form sections
            const emailField = await page.locator('input[name="email"]').count();
            const healthSection = await page.locator('text="Current Health Conditions"').count();
            const allergySection = await page.locator('text="Allergies & Food Restrictions"').count();
            const dietSection = await page.locator('text="Diet History"').count();
            const goalsSection = await page.locator('text="Your Goals & Priorities"').count();

            console.log(`  ✓ Email field: ${emailField > 0 ? 'YES' : 'NO'}`);
            console.log(`  ✓ Health section: ${healthSection > 0 ? 'YES' : 'NO'}`);
            console.log(`  ✓ Allergies section: ${allergySection > 0 ? 'YES' : 'NO'}`);
            console.log(`  ✓ Diet History section: ${dietSection > 0 ? 'YES' : 'NO'}`);
            console.log(`  ✓ Goals section: ${goalsSection > 0 ? 'YES' : 'NO'}`);

            // Step 8: Test form submission (without actually sending)
            console.log('\nStep 8: Testing form fields can be filled...');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="firstName"]', 'John');
            await page.fill('textarea[name="medications"]', 'Test medication');
            console.log('  ✓ Form fields can be populated');

            // Get submitted email for verification
            const submittedEmail = await page.inputValue('input[name="email"]');
            console.log(`  ✓ Email captured: ${submittedEmail}`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ PAID FLOW TEST COMPLETE');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error);
    } finally {
        await browser.close();
    }
})();
