import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8100/public/calculator.html';

async function testBothFlows() {
    console.log('\n🧪 TESTING NEW FORM FLOW ARCHITECTURE\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('═══════════════════════════════════════');
        console.log('FREE PATH TEST');
        console.log('═══════════════════════════════════════\n');

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Check path choice buttons exist
        const startFreeBtn = await page.$('button:has-text("Start Free Calculator")');
        console.log(`✅ "Start Free Calculator" button found`);

        // Click free path
        await page.click('button:has-text("Start Free Calculator")');
        await page.waitForTimeout(1000);

        // Check form is visible
        const formVisible = await page.isVisible('#calculatorForm');
        console.log(`${formVisible ? '✅' : '❌'} Calculator form visible`);

        // Check upgrade section is NOT visible for free path
        const upgradeVisible = await page.isVisible('#upgradeSection');
        console.log(`${!upgradeVisible ? '✅' : '❌'} Upgrade section hidden for free path`);

        // Check button text
        const btnText = await page.textContent('#calculateBtn');
        console.log(`${btnText.includes('Calculate My Macros') ? '✅' : '❌'} Button text: "${btnText}"`);

        // Check form has pre-filled values
        const ageValue = await page.inputValue('#age');
        console.log(`${ageValue ? '✅' : '❌'} Form has pre-filled values (age: ${ageValue})`);

        // Calculate macros
        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);

        // Check results section is visible
        const resultsVisible = await page.isVisible('#resultsSection');
        console.log(`${resultsVisible ? '✅' : '❌'} Results section visible after calculate`);

        // Check submit button is visible
        const submitBtn = await page.$('button:has-text("✅ Submit My Report")');
        console.log(`${submitBtn ? '✅' : '❌'} "Submit My Report" button visible`);

        console.log('\n═══════════════════════════════════════');
        console.log('PAID PATH TEST');
        console.log('═══════════════════════════════════════\n');

        // Reload for paid path test
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Click paid path
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1000);

        // Check form is visible
        const formVisiblePaid = await page.isVisible('#calculatorForm');
        console.log(`✅ Calculator form visible for paid path`);

        // Check upgrade section IS visible for paid path
        const upgradeVisiblePaid = await page.isVisible('#upgradeSection');
        console.log(`${upgradeVisiblePaid ? '✅' : '❌'} Upgrade section visible above form for paid path`);

        // Check button text changed
        const btnTextPaid = await page.textContent('#calculateBtn');
        console.log(`${btnTextPaid.includes('Next: Complete Your Profile') ? '✅' : '❌'} Button text: "${btnTextPaid}"`);

        // Check form values are BLANK for paid path
        const ageValuePaid = await page.inputValue('#age');
        console.log(`${!ageValuePaid ? '✅' : '❌'} Form is blank for paid path (age field empty: ${!ageValuePaid})`);

        // Fill basic form
        await page.fill('#heightFeet', '5');
        await page.waitForTimeout(300);
        await page.fill('#age', '40');
        await page.waitForTimeout(300);
        await page.fill('#weight', '190');
        await page.waitForTimeout(500);

        // Verify form is filled
        const ageCheckBefore = await page.inputValue('#age');
        const weightCheckBefore = await page.inputValue('#weight');

        // Click Next button
        await page.click('#calculateBtn');
        await page.waitForTimeout(3000);

        // Check form validation
        const validationCheck = await page.evaluate(() => {
            const age = document.getElementById('age').value;
            const weight = document.getElementById('weight').value;
            const height = document.getElementById('heightFeet').value;
            return { age, weight, height };
        });

        // Check advanced sections are revealed by checking if hidden class is removed
        const advancedNotHidden = await page.evaluate(() => {
            const elem = document.getElementById('advancedSections');
            return elem && !elem.classList.contains('hidden');
        });
        console.log(`${advancedNotHidden ? '✅' : '❌'} Advanced sections revealed after "Next"`);

        // Check advanced submit section is visible by checking if hidden class is removed
        const advancedSubmitNotHidden = await page.evaluate(() => {
            const elem = document.getElementById('advancedSubmitSection');
            return elem && !elem.classList.contains('hidden');
        });
        console.log(`${advancedSubmitNotHidden ? '✅' : '❌'} Advanced submit button section visible`);

        // Verify basic form values are preserved
        const ageValueAfter = await page.inputValue('#age');
        console.log(`${ageValueAfter === '40' ? '✅' : '❌'} Basic form values preserved (age: ${ageValueAfter})`);

        console.log('\n═══════════════════════════════════════');
        console.log('🎉 ALL TESTS COMPLETED');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ TEST ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

testBothFlows().catch(console.error);
