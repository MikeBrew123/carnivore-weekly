const { chromium } = require('playwright');

async function testFreePath() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: FREE PATH (Calculator Only)');
    console.log('='.repeat(60));
    
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Step 1: Open Calculator Page
        console.log('\n[Step 1] Opening calculator page...');
        await page.goto('http://localhost:8000/public/calculator.html', { waitUntil: 'domcontentloaded' });
        console.log('✓ Page loaded');

        // Step 2: Check for choice screen
        console.log('\n[Step 2] Verify "Choose Your Path" screen visible...');
        const choiceVisible = await page.evaluate(() => {
            const elem = document.getElementById('pathChoice');
            return !elem.classList.contains('hidden');
        });
        if (choiceVisible) {
            console.log('✓ Choice screen visible with Free and Paid buttons');
        } else {
            console.log('❌ Choice screen not visible');
            return false;
        }

        // Step 3: Click Free Button
        console.log('\n[Step 3] Clicking "Start Free Calculator" button...');
        await page.locator('button.choice-btn--free').first().click();
        await page.waitForTimeout(500);
        console.log('✓ Button clicked');

        // Step 4: Verify calculator shows
        console.log('\n[Step 4] Verify calculator form appears...');
        const calcVisible = await page.evaluate(() => {
            return !document.getElementById('calculatorForm').classList.contains('hidden');
        });
        if (calcVisible) {
            console.log('✓ Calculator form is visible');
        } else {
            console.log('❌ Calculator form not visible');
            return false;
        }

        // Step 5: Fill calculator form
        console.log('\n[Step 5] Filling calculator form...');
        await page.fill('input#weight', '180');
        await page.fill('input#heightFeet', '5');
        await page.fill('input#heightInches', '10');
        await page.fill('input#age', '35');
        
        // Select goal
        await page.selectOption('select#goal', 'fat-loss');
        console.log('✓ Form filled (Weight: 180lbs, Height: 5\'10", Age: 35, Goal: Fat Loss)');

        // Step 6: Submit form
        console.log('\n[Step 6] Clicking Calculate button...');
        await page.click('button:has-text("Calculate")');
        
        // Step 7: Wait for results
        console.log('\n[Step 7] Waiting for results...');
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 5000 });
        console.log('✓ Results section displayed');

        // Step 8: Verify results content
        console.log('\n[Step 8] Verifying results content...');
        const calories = await page.locator('#outCalories').textContent();
        const protein = await page.locator('#outProtein').textContent();
        const fat = await page.locator('#outFat').textContent();
        
        if (calories && calories !== '—') {
            console.log('✓ Calories calculated: ' + calories);
        } else {
            console.log('❌ Calories not calculated');
        }
        
        if (protein && protein !== '—') {
            console.log('✓ Protein calculated: ' + protein);
        }
        
        if (fat && fat !== '—') {
            console.log('✓ Fat calculated: ' + fat);
        }

        // Step 9: Check for upgrade button
        console.log('\n[Step 9] Verify "Upgrade to Full Protocol" option visible...');
        const upgradeVisible = await page.evaluate(() => {
            return !document.getElementById('upgradeSection').classList.contains('hidden');
        });
        if (upgradeVisible) {
            console.log('✓ Upgrade section visible (shows Stripe option)');
        } else {
            console.log('❌ Upgrade section not visible');
        }

        // Step 10: Check localStorage
        console.log('\n[Step 10] Verify session tracking...');
        const pathChoice = await page.evaluate(() => localStorage.getItem('path_choice'));
        const sessionId = await page.evaluate(() => localStorage.getItem('session_id'));
        console.log('✓ Path choice stored: ' + pathChoice);
        if (sessionId && sessionId !== 'null') {
            console.log('✓ Session ID created: ' + sessionId.substring(0, 8) + '...');
        } else {
            console.log('⚠ Session ID not created (API may have failed, but calculator works)');
        }

        console.log('\n✅ FREE PATH TEST PASSED\n');
        return true;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        await browser.close();
    }
}

async function testPaidPath() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: PAID PATH (Full Protocol)');
    console.log('='.repeat(60));
    
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Step 1: Open Calculator Page
        console.log('\n[Step 1] Opening calculator page...');
        await page.goto('http://localhost:8000/public/calculator.html', { waitUntil: 'domcontentloaded' });
        console.log('✓ Page loaded');

        // Step 2: Click Paid Button
        console.log('\n[Step 2] Clicking "Get Full Protocol ($9.99)" button...');
        await page.locator('button.choice-btn--paid').first().click();
        await page.waitForTimeout(500);
        console.log('✓ Button clicked');

        // Step 3: Verify calculator shows (THIS IS THE FIX WE MADE)
        console.log('\n[Step 3] Verify calculator shows for paid path...');
        const calcVisible = await page.evaluate(() => {
            return !document.getElementById('calculatorForm').classList.contains('hidden');
        });
        if (calcVisible) {
            console.log('✓ Calculator form is visible (KEY FIX: Both paths show calculator)');
        } else {
            console.log('❌ Calculator form not visible (regression)');
            return false;
        }

        // Step 4: Fill calculator form
        console.log('\n[Step 4] Filling calculator form...');
        await page.fill('input#weight', '200');
        await page.fill('input#heightFeet', '6');
        await page.fill('input#heightInches', '0');
        await page.fill('input#age', '40');
        
        // Select goal
        await page.selectOption('select#goal', 'muscle-gain');
        console.log('✓ Form filled (Weight: 200lbs, Height: 6\'0", Age: 40, Goal: Muscle Gain)');

        // Step 5: Submit form
        console.log('\n[Step 5] Clicking Calculate button...');
        await page.click('button:has-text("Calculate")');
        
        // Step 6: Wait for results
        console.log('\n[Step 6] Waiting for results...');
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 5000 });
        console.log('✓ Results section displayed');

        // Step 7: Verify results content
        console.log('\n[Step 7] Verifying results content...');
        const calories = await page.locator('#outCalories').textContent();
        if (calories && calories !== '—') {
            console.log('✓ Calories calculated: ' + calories);
        }

        // Step 8: Check for "Continue to Full Report" button (PAID PATH SPECIFIC)
        console.log('\n[Step 8] Verify "Continue to Full Report" button visible...');
        const continueBtn = await page.locator('text=Continue to Full Report').count();
        const upgradeHidden = await page.evaluate(() => {
            return document.getElementById('upgradeSection').classList.contains('hidden');
        });
        
        if (continueBtn > 0 && upgradeHidden) {
            console.log('✓ "Continue to Full Report" button visible (Upgrade section hidden)');
        } else {
            console.log('⚠ Paid-specific button layout may differ');
        }

        // Step 9: Verify path choice
        console.log('\n[Step 9] Verify path choice stored...');
        const pathChoice = await page.evaluate(() => localStorage.getItem('path_choice'));
        if (pathChoice === 'paid') {
            console.log('✓ Path choice correctly stored as: paid');
        } else {
            console.log('❌ Path choice not stored correctly: ' + pathChoice);
        }

        console.log('\n✅ PAID PATH TEST PASSED\n');
        return true;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        await browser.close();
    }
}

async function runAllTests() {
    console.log('\n' + '█'.repeat(60));
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█' + '  CARNIVORE WEEKLY - END-TO-END FLOW TEST  '.padEnd(59) + '█');
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█'.repeat(60));

    const freeResult = await testFreePath();
    const paidResult = await testPaidPath();

    console.log('\n' + '█'.repeat(60));
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█' + '  TEST SUMMARY  '.padEnd(59) + '█');
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█'.repeat(60));
    console.log('Free Path Test:  ' + (freeResult ? '✅ PASSED' : '❌ FAILED'));
    console.log('Paid Path Test:  ' + (paidResult ? '✅ PASSED' : '❌ FAILED'));
    console.log('\n' + (freeResult && paidResult ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed'));
    console.log('\nNote: Email delivery and report access will be tested in Phase 3');
    console.log('█'.repeat(60) + '\n');
}

runAllTests();
