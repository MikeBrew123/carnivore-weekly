import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8100/public/calculator.html';

async function testPaidFlow() {
    console.log('\n🧪 DETAILED PAID PATH TEST\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Log console messages
    page.on('console', msg => {
        console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    try {
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        console.log('✅ Page loaded');

        // Click paid path
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1500);

        console.log('✅ Clicked paid path button');

        // Check form is blank
        const ageValue = await page.inputValue('#age');
        console.log(`Form age value: "${ageValue}" (should be empty)`);

        // Fill in basic form fields
        console.log('\nFilling form fields...');
        await page.fill('#heightFeet', '5');
        await page.waitForTimeout(300);
        await page.fill('#age', '40');
        await page.waitForTimeout(300);
        await page.fill('#weight', '190');
        await page.waitForTimeout(500);

        // Verify fields are filled
        const ageAfterFill = await page.inputValue('#age');
        const weightAfterFill = await page.inputValue('#weight');
        const heightAfterFill = await page.inputValue('#heightFeet');
        console.log(`\nForm filled with: age=${ageAfterFill}, weight=${weightAfterFill}, heightFeet=${heightAfterFill}`);

        // Check if we can see the button
        const btnVisible = await page.isVisible('#calculateBtn');
        console.log(`Calculate button visible: ${btnVisible}`);

        const btnText = await page.textContent('#calculateBtn');
        console.log(`Button text: "${btnText}"`);

        // Try clicking the button and see what happens
        console.log('\nClicking "Next: Complete Your Profile" button...');
        await page.click('#calculateBtn');
        await page.waitForTimeout(3000);

        // Check what's visible now
        const emailFieldVisible = await page.isVisible('#email');
        console.log(`Email field visible: ${emailFieldVisible}`);

        const advancedSectionHidden = await page.evaluate(() => {
            const elem = document.getElementById('advancedSections');
            return elem.classList.contains('hidden');
        });
        console.log(`Advanced sections hidden: ${advancedSectionHidden}`);

        // Check calculate button status
        const btnDisplayStyle = await page.evaluate(() => {
            return window.getComputedStyle(document.getElementById('calculateBtn')).display;
        });
        console.log(`Calculate button display: ${btnDisplayStyle}`);

        // Check if form values are still there
        const ageAfterClick = await page.inputValue('#age');
        console.log(`Age after click: "${ageAfterClick}"`);

        // Scroll to see what's visible
        console.log('\nScrolling to bottom of page to see full layout...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Check advanced submit section
        const advancedSubmitVisible = await page.isVisible('#advancedSubmitSection');
        console.log(`Advanced submit section visible: ${advancedSubmitVisible}`);

    } catch (error) {
        console.error('❌ TEST ERROR:', error.message);
        console.error(error);
    } finally {
        await browser.close();
    }
}

testPaidFlow().catch(console.error);
